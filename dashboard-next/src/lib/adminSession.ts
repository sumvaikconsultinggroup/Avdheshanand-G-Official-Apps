/**
 * Builds an admin session (JWT + safe profile) from an AdminAccess document.
 *
 * Used by BOTH `/api/auth/signin` and `/api/admin/me`, so a token minted at login
 * and a token re-minted after a permission change are always identical in shape.
 *
 * Node runtime only (jsonwebtoken). The edge middleware verifies with `jose`;
 * both share the HS256 JWT_SECRET.
 */

import jwt from 'jsonwebtoken';
import type { Document } from 'mongodb';
import type { NextRequest } from 'next/server';
import {
  encodePermissions,
  isRoleName,
  resolvePermissions,
  type PermissionMap,
  type RoleName,
} from './permissions';

export interface Caller {
  adminId: string;
  role: RoleName;
}

/**
 * Identify the caller from their JWT. The middleware has already verified the
 * token before the route runs; this re-reads it to get WHO is calling, which
 * routes need for self-lockout and privilege-escalation guards.
 */
export function getCaller(req: NextRequest): Caller | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value;

  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      adminId?: string;
      role?: string;
    };
    if (!payload?.adminId) return null;
    const raw = typeof payload.role === 'string' ? payload.role.toLowerCase() : '';
    return { adminId: String(payload.adminId), role: isRoleName(raw) ? raw : 'admin' };
  } catch {
    return null;
  }
}

export interface AdminSession {
  token: string;
  role: RoleName;
  /** The EFFECTIVE map: the admin's custom map, or their role template. */
  permissions: PermissionMap;
  user: Record<string, unknown>;
}

/**
 * Legacy admin docs may have no `role` field at all. Those accounts predate the
 * RBAC rollout and were full admins in practice, so treat a missing role as
 * 'admin' rather than locking them out.
 */
export function effectiveRole(admin: Document): RoleName {
  const raw = typeof admin.role === 'string' ? admin.role.toLowerCase() : '';
  return isRoleName(raw) ? raw : 'admin';
}

export function effectivePermissions(admin: Document): PermissionMap {
  return resolvePermissions(effectiveRole(admin), admin.permissions as PermissionMap | undefined);
}

export function buildAdminSession(admin: Document): AdminSession {
  const role = effectiveRole(admin);
  const permissions = effectivePermissions(admin);

  const token = jwt.sign(
    {
      adminId: admin._id,
      name: admin.name,
      role,
      // Compact bitmask map — the middleware decodes this to enforce every request.
      perms: encodePermissions(permissions),
      allowedService: admin.allowedService || [],
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' }
  );

  const { password: _p, otp: _o, otpExpiry: _e, ...safeAdmin } = admin as Record<string, unknown>;

  return {
    token,
    role,
    permissions,
    // Hand the client the RESOLVED permissions so the app never has to guess.
    user: { ...safeAdmin, role, permissions },
  };
}
