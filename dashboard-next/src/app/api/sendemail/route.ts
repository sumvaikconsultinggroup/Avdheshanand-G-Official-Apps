import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/utils/sendEmail';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '../../../utils/verifyJwtToken';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Secure handler for POST requests to send emails
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: No authentication token provided' },
        { status: 401 }
      );
    }

    let decoded: { role?: string } | null = null;
    try {
      decoded = await verifyJwtToken(authToken) as { role?: string };
    } catch {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check role - only admin or superadmin can send emails
    if (decoded?.role !== 'admin' && decoded?.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse the JSON request body
    const body: EmailPayload = await request.json();
    const { to, subject, text, html } = body;

    // Validate inputs
    if (!to || !subject || !text) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required email parameters',
        },
        { status: 400 }
      );
    }

    // Send via Resend (see utils/sendEmail — backed by RESEND_API_KEY)
    const info = await sendEmail(to, subject, text, html);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Email sending failed:', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests to this endpoint
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed',
    },
    { status: 405 }
  );
}
