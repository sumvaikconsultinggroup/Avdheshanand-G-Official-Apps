import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

// Resolve the authenticated user id from the Bearer token (or auth cookie).
function getUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : undefined;
  const token = bearer || req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, {
      algorithms: ['HS256'],
    }) as { userId?: string };
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

function serialize(user: any) {
  return {
    _id: user._id,
    name: user.profile?.fullName || user.name || user.username,
    username: user.username,
    email: user.email,
    phone: user.profile?.contact || user.contact || '',
    role: user.role,
    status: user.status,
    profile: user.profile,
    authMethod: user.authMethod,
    createdAt: user.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }
  try {
    await connectDB();
    const user = await User.findById(userId).select('-password -otp -otpExpiry -__v').lean();
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, user: serialize(user) }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to load profile', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// Update the current user's editable fields. Works for both 'normal' and
// 'oauth' accounts (email/auth method are NOT editable here).
export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : undefined;
    const phoneRaw = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : undefined;

    if (fullName !== undefined && fullName.length === 0) {
      return NextResponse.json({ success: false, message: 'Name cannot be empty' }, { status: 400 });
    }
    if (phoneRaw && !/^[0-9]{10}$/.test(phoneRaw)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    user.profile = user.profile || {};
    if (fullName !== undefined) {
      user.profile.fullName = fullName;
      // Keep the oauth display `name` in sync when present.
      if (user.authMethod === 'oauth') user.name = fullName;
    }
    if (phoneRaw !== undefined) {
      user.profile.contact = phoneRaw;
    }

    await user.save();

    return NextResponse.json(
      { success: true, message: 'Profile updated', user: serialize(user) },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ success: false, message: 'Validation error', error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: 'Failed to update profile', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
