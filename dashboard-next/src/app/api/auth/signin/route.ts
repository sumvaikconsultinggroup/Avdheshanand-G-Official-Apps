import { connectDB } from '../../../../utils/mongodbConnect';
import { Collection, Document } from 'mongodb';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { authLimiter, getClientIp } from '@/lib/rateLimiter';
import { checkAccountLockout, recordFailedAttempt, clearLockout } from '@/lib/security';
import { buildAdminSession } from '@/lib/adminSession';

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = getClientIp(req);
    const rateResult = authLimiter.check(ip);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(rateResult.retryAfter || 60) } }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
    }

    // Account lockout check
    const lockoutKey = `admin:${username}`;
    const lockout = checkAccountLockout(lockoutKey);
    if (lockout.locked) {
      return NextResponse.json(
        {
          success: false,
          message: `Account temporarily locked. Try again in ${lockout.retryAfterSeconds} seconds.`,
          code: 'ACCOUNT_LOCKED',
        },
        { status: 423 }
      );
    }

    const db = await connectDB('DB', 'test');
    const users: Collection<Document> = db.collection('AdminAccess');

    const admin = await users.findOne({ username });

    if (!admin) {
      recordFailedAttempt(lockoutKey);
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      const lockResult = recordFailedAttempt(lockoutKey);
      const msg = lockResult.locked
        ? 'Account locked due to too many failed attempts. Try again in 15 minutes.'
        : `Invalid credentials. ${lockResult.remainingAttempts} attempts remaining.`;
      return NextResponse.json({ success: false, message: msg }, { status: 401 });
    }

    // A deactivated member must not be able to sign in, even with the right
    // password. (Previously `isActive` was written but never checked.)
    if (admin.isActive === false) {
      return NextResponse.json(
        { success: false, message: 'This account has been deactivated. Contact a super admin.' },
        { status: 403 }
      );
    }

    // Successful login — clear lockout
    clearLockout(lockoutKey);

    // Mints the JWT carrying role + the compact per-module permission map that
    // the middleware enforces on every subsequent request.
    const { token, user: safeAdmin } = buildAdminSession(admin);

    const response = NextResponse.json(
      {
        success: true,
        message: 'Signin successful',
        data: { user: safeAdmin, token },
        user: safeAdmin,
        token,
      },
      { status: 200 }
    );

    const cookieOptions = {
      httpOnly: true as const,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours (not 7 days)
    };
    response.cookies.set({ name: 'auth_token', value: token, ...cookieOptions });
    response.cookies.set({ name: 'token', value: token, ...cookieOptions });
    return response;
  } catch (error) {
    console.error('Admin signin error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: false, message: 'Method not allowed' }, { status: 405 });
}
