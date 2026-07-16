/**
 * GET /api/admin/me — the calling admin's OWN role + effective permissions,
 * plus a freshly minted token.
 *
 * Why this exists:
 *  - `/api/users/all-permissions/:id` is superadmin-only, so a non-superadmin
 *    could never read their own permissions (it 403'd and the app silently fell
 *    back to a hardcoded template). This endpoint is open to any authenticated
 *    admin, but ONLY ever returns their own record.
 *  - The JWT carries the permission map, so a superadmin changing someone's
 *    access would otherwise not take effect until that token expired (24h).
 *    The app calls this on launch/refresh, gets a re-minted token with the
 *    current permissions, and swaps it in. That closes the staleness window.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/utils/mongodbConnect';
import { buildAdminSession } from '@/lib/adminSession';

function getToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice('Bearer '.length).trim();
  return req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value || null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const token = getToken(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    let adminId: string;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { adminId?: string };
      if (!payload?.adminId) throw new Error('No adminId in token');
      adminId = String(payload.adminId);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    const db = await connectDB('DB', 'test');
    const admin = await db.collection('AdminAccess').findOne({ _id: new ObjectId(adminId) });

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Account no longer exists' }, { status: 401 });
    }

    // A member deactivated mid-session loses access immediately on next refresh.
    if (admin.isActive === false) {
      return NextResponse.json(
        { success: false, message: 'This account has been deactivated.', code: 'DEACTIVATED' },
        { status: 403 }
      );
    }

    const session = buildAdminSession(admin);

    return NextResponse.json({
      success: true,
      role: session.role,
      permissions: session.permissions,
      // Re-minted token carrying the CURRENT permissions — the app swaps this in.
      token: session.token,
      user: session.user,
    });
  } catch (error) {
    console.error('GET /api/admin/me error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
