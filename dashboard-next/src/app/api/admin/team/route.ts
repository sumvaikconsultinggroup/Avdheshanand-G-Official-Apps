/**
 * Team Management API
 *
 * GET    /api/admin/team   — List team members (needs `users:view`)
 * POST   /api/admin/team   — Add a member          — SUPERADMIN ONLY
 * PUT    /api/admin/team   — Update role/permissions/profile/isActive — SUPERADMIN ONLY
 * DELETE /api/admin/team   — Deactivate a member   — SUPERADMIN ONLY
 *
 * Only a superadmin may grant roles or per-module permissions. Previously ANY
 * admin could POST a brand-new superadmin — a straight privilege-escalation path.
 * Guards below also prevent a superadmin from locking themselves (or the last
 * remaining superadmin) out of the platform.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collection, Document, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getCaller } from '@/lib/adminSession';
import {
  isRoleName,
  ROLE_TEMPLATES,
  sanitizePermissionMap,
  type PermissionMap,
  type RoleName,
} from '@/lib/permissions';

async function getAdminCollection(): Promise<Collection<Document>> {
  const { connectDB } = await import('@/utils/mongodbConnect');
  const db = await connectDB('DB', 'test');
  return db.collection('AdminAccess');
}

function forbidden(message: string) {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

/** Every mutation on this route is superadmin-only. */
function requireSuperadmin(req: NextRequest) {
  const caller = getCaller(req);
  if (!caller) {
    return { caller: null, deny: NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 }) };
  }
  if (caller.role !== 'superadmin') {
    return { caller, deny: forbidden('Only a super admin can manage team roles and permissions.') };
  }
  return { caller, deny: null };
}

/**
 * If a custom permission map was supplied, store it (sanitized). Otherwise store
 * the role's template, so the stored map is ALWAYS the effective one — no
 * ambiguity between "no map" and "empty map".
 */
function resolveStoredPermissions(role: RoleName, permissions: unknown): PermissionMap {
  if (permissions && typeof permissions === 'object' && Object.keys(permissions).length > 0) {
    return sanitizePermissionMap(permissions);
  }
  return ROLE_TEMPLATES[role];
}

// GET — List all team members (excluding passwords). Gated by `users:view`.
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const collection = await getAdminCollection();

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';

    const filter: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
    }
    if (role) filter.role = role;

    const admins = await collection
      .find(filter)
      .project({ password: 0, otp: 0, otpExpiry: 0 })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: admins, total: admins.length });
  } catch (error) {
    console.error('GET team error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch team' }, { status: 500 });
  }
}

// POST — Create new team member. SUPERADMIN ONLY.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { deny } = requireSuperadmin(req);
    if (deny) return deny;

    const body = await req.json();
    const { name, username, email, password, role, permissions, allowedService } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, username, and password are required' },
        { status: 400 }
      );
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }
    if (role !== undefined && !isRoleName(role)) {
      return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
    }

    const finalRole: RoleName = isRoleName(role) ? role : 'viewer';

    const collection = await getAdminCollection();

    const existing = await collection.findOne({ username });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = {
      name,
      username,
      email: email || null,
      password: hashedPassword,
      role: finalRole,
      permissions: resolveStoredPermissions(finalRole, permissions),
      allowedService: allowedService || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newAdmin);
    const { password: _, ...safeAdmin } = newAdmin;

    return NextResponse.json(
      {
        success: true,
        message: 'Team member created successfully',
        data: { ...safeAdmin, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST team error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create team member' }, { status: 500 });
  }
}

// PUT — Update role / permissions / profile / isActive. SUPERADMIN ONLY.
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const { caller, deny } = requireSuperadmin(req);
    if (deny) return deny;

    const body = await req.json();
    const { id, role, permissions, allowedService, name, email, isActive } = body;

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return NextResponse.json({ success: false, message: 'Valid team member ID is required' }, { status: 400 });
    }
    if (role !== undefined && !isRoleName(role)) {
      return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
    }

    const collection = await getAdminCollection();
    const target = await collection.findOne({ _id: new ObjectId(id) });
    if (!target) {
      return NextResponse.json({ success: false, message: 'Team member not found' }, { status: 404 });
    }

    const isSelf = caller!.adminId === String(target._id);

    // Self-lockout guards: a superadmin must not be able to strip their own
    // powers or switch themselves off and lose access to this very screen.
    if (isSelf && role !== undefined && role !== 'superadmin') {
      return forbidden('You cannot change your own role. Ask another super admin.');
    }
    if (isSelf && isActive === false) {
      return forbidden('You cannot deactivate your own account.');
    }
    if (isSelf && permissions !== undefined) {
      return forbidden('You cannot restrict your own permissions.');
    }

    // Never allow the LAST active superadmin to be demoted — that would leave
    // the platform with nobody able to manage roles ever again.
    const demotingASuperadmin =
      target.role === 'superadmin' && ((role !== undefined && role !== 'superadmin') || isActive === false);
    if (demotingASuperadmin) {
      const activeSuperadmins = await collection.countDocuments({
        role: 'superadmin',
        isActive: { $ne: false },
      });
      if (activeSuperadmins <= 1) {
        return forbidden('This is the last active super admin. Promote another one first.');
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // Role and permissions move together: changing the role without an explicit
    // custom map re-seeds the map from that role's template, so the stored map is
    // never left describing the OLD role.
    if (role !== undefined) {
      updateData.role = role;
      updateData.permissions = resolveStoredPermissions(role as RoleName, permissions);
    } else if (permissions !== undefined) {
      const currentRole: RoleName = isRoleName(target.role) ? target.role : 'viewer';
      updateData.permissions = resolveStoredPermissions(currentRole, permissions);
    }

    if (allowedService !== undefined) updateData.allowedService = allowedService;
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after', projection: { password: 0, otp: 0, otpExpiry: 0 } }
    );

    if (!result) {
      return NextResponse.json({ success: false, message: 'Team member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Team member updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('PUT team error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update team member' }, { status: 500 });
  }
}

// DELETE — Deactivate team member (soft delete). SUPERADMIN ONLY.
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { caller, deny } = requireSuperadmin(req);
    if (deny) return deny;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return NextResponse.json({ success: false, message: 'Valid team member ID is required' }, { status: 400 });
    }

    const collection = await getAdminCollection();
    const target = await collection.findOne({ _id: new ObjectId(id) });
    if (!target) {
      return NextResponse.json({ success: false, message: 'Team member not found' }, { status: 404 });
    }

    if (caller!.adminId === String(target._id)) {
      return forbidden('You cannot deactivate your own account.');
    }

    if (target.role === 'superadmin') {
      const activeSuperadmins = await collection.countDocuments({
        role: 'superadmin',
        isActive: { $ne: false },
      });
      if (activeSuperadmins <= 1) {
        return forbidden('This is the last active super admin. Promote another one first.');
      }
    }

    await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    return NextResponse.json({ success: true, message: 'Team member deactivated successfully' });
  } catch (error) {
    console.error('DELETE team error:', error);
    return NextResponse.json({ success: false, message: 'Failed to deactivate team member' }, { status: 500 });
  }
}
