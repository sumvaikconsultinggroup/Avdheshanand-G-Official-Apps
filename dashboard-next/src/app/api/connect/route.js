import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Connect from '@/models/Connect';
import {
  sendResendEmail,
  buildContactConfirmationEmail,
  buildContactNotificationEmail,
} from '@/utils/resendMailer';

// GET all contact submissions
export async function GET() {
  try {
    await connectDB();

    const submissions = await Connect.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();

    if (!submissions || submissions.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No contact submissions found',
          data: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Contact submissions retrieved successfully',
        data: submissions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching contact submissions:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve contact submissions',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST new contact submission
export async function POST(request) {
  try {
    await connectDB();

    const contentType = request.headers.get('content-type') || '';
    let values = {
      fullName: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    };

    if (contentType.includes('application/json')) {
      const body = await request.json();
      values = {
        fullName: String(body?.fullName || ''),
        email: String(body?.email || ''),
        phone: String(body?.phone || ''),
        subject: String(body?.subject || ''),
        message: String(body?.message || ''),
      };
    } else {
      const formData = await request.formData();

      if (!formData) {
        return NextResponse.json({ success: false, message: 'No form data found' }, { status: 400 });
      }

      values = {
        fullName: String(formData.get('fullName') || ''),
        email: String(formData.get('email') || ''),
        phone: String(formData.get('phone') || ''),
        subject: String(formData.get('subject') || ''),
        message: String(formData.get('message') || ''),
      };
    }

    if (!values.fullName || !values.email || !values.subject || !values.message) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: fullName, email, subject, and message are required',
        },
        { status: 400 }
      );
    }

    const newSubmission = await Connect.create({
      fullName: values.fullName.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone?.trim() || '',
      subject: values.subject.trim(),
      message: values.message.trim(),
      status: 'new',
      lastActionAt: new Date(),
    });

    // Send a branded confirmation to the submitter and notify the office.
    // Email delivery must never block or fail the submission, so each send is
    // guarded and the helper no-ops when RESEND_API_KEY is not configured.
    try {
      const confirmation = buildContactConfirmationEmail({
        fullName: values.fullName,
        subject: values.subject,
        message: values.message,
      });
      await sendResendEmail({
        to: values.email,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
        replyTo: process.env.CONTACT_NOTIFY_EMAIL || 'office@avdheshanandg.org',
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    const officeInbox = process.env.CONTACT_NOTIFY_EMAIL;
    if (officeInbox) {
      try {
        const notification = buildContactNotificationEmail({
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          subject: values.subject,
          message: values.message,
        });
        await sendResendEmail({
          to: officeInbox,
          subject: notification.subject,
          html: notification.html,
          text: notification.text,
          replyTo: values.email,
        });
      } catch (notifyError) {
        console.error('Error sending office notification email:', notifyError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Contact submission created successfully',
        data: newSubmission,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contact submission:', error);

    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create contact submission',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
