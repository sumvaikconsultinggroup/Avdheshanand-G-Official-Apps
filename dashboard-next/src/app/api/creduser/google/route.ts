import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

type ApiResponse = {
  success: boolean;
  message: string;
  user?: unknown;
  token?: string;
  error?: string;
};

// All client IDs that may have minted the id_token (web for Expo/AuthSession,
// plus the native Android/iOS client IDs in a dev/standalone build). The token's
// `aud` must match one of these.
function allowedAudiences(): string[] {
  return [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_EXPO_CLIENT_ID,
  ].filter((v): v is string => Boolean(v));
}

const client = new OAuth2Client();

export async function POST(req: Request): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await req.json();
    const idToken: string | undefined = body?.idToken || body?.credential || body?.id_token;

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: 'Missing Google idToken' },
        { status: 400 }
      );
    }

    const audience = allowedAudiences();
    if (audience.length === 0) {
      console.error('[google-auth] No GOOGLE_*_CLIENT_ID configured');
      return NextResponse.json(
        { success: false, message: 'Google sign-in is not configured on the server' },
        { status: 500 }
      );
    }

    // Verify the token's signature, expiry, issuer and audience with Google.
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('[google-auth] Token verification failed:', verifyError);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired Google token' },
        { status: 401 }
      );
    }

    if (!payload?.email || !payload.sub) {
      return NextResponse.json(
        { success: false, message: 'Google account did not provide an email' },
        { status: 400 }
      );
    }
    if (payload.email_verified === false) {
      return NextResponse.json(
        { success: false, message: 'Your Google email is not verified' },
        { status: 401 }
      );
    }

    const email = payload.email.toLowerCase().trim();
    const fullName = payload.name || email.split('@')[0];
    const picture = payload.picture || '/placeholder.svg';

    await connectDB();

    // Link by email: an existing account (normal OR oauth) logs in; otherwise
    // a new oauth user is created. One account per email — "both" methods, one user.
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        authMethod: 'oauth',
        uid: payload.sub,
        name: fullName,
        picture,
        email,
        username: fullName.slice(0, 20),
        isOTPVerified: true, // Google already verified the email
        status: 'active',
        role: 'user',
        profile: {
          fullName,
          profileImage: picture,
        },
      });
    } else if (user.authMethod === 'oauth' && !user.uid) {
      // Backfill uid for an oauth user that predates this field.
      user.uid = payload.sub;
      await user.save();
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    const userResponse = {
      _id: user._id,
      name: user.profile?.fullName || user.name || user.username,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile,
      authMethod: user.authMethod,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json(
      { success: true, message: 'Signed in with Google', user: userResponse, token },
      { status: 200 }
    );

    const cookieOptions = {
      httpOnly: true as const,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 3600,
      path: '/',
    };
    response.cookies.set({ name: 'token', value: token, ...cookieOptions });
    response.cookies.set({ name: 'auth_token', value: token, ...cookieOptions });

    return response;
  } catch (error) {
    console.error('Google sign-in error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Google sign-in failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
