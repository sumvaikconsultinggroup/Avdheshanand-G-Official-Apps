import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Connect from '@/models/Connect';
import mongoose from 'mongoose';
import { sendResendEmail, buildPrayerResponseEmail } from '@/utils/resendMailer';

/**
 * GET handler for fetching a single contact submission by ID
 */
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // Validate MongoDB ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid ID format',
        },
        { status: 400 }
      );
    }

    // Find the contact submission by ID
    const submission = await Connect.findOne({
      _id: id,
      isDeleted: { $ne: true },
    }).lean();

    // Return 404 if not found
    if (!submission) {
      return NextResponse.json(
        {
          success: false,
          message: 'Contact submission not found',
        },
        { status: 404 }
      );
    }

    // Return the found submission
    return NextResponse.json(
      {
        success: true,
        message: 'Contact submission retrieved successfully',
        data: submission,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching contact submission:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve contact submission',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid ID format' }, { status: 400 });
    }

    const body = await request.json();
    const updateData = {
      ...(body.status && { status: body.status }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo || '' }),
      ...(body.assignedToName !== undefined && { assignedToName: body.assignedToName || '' }),
      ...(body.internalNotes !== undefined && { internalNotes: body.internalNotes || '' }),
      ...(body.responseText !== undefined && { responseText: body.responseText || '' }),
      lastActionAt: new Date(),
      ...(body.status === 'responded' && { respondedAt: new Date() }),
    };

    const updated = await Connect.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Contact submission not found' }, { status: 404 });
    }

    let emailSent = false;
    let emailError;

    if (body.sendResponse && body.responseText) {
      if (!updated.email) {
        emailError = 'This request has no email address on file.';
      } else {
        const mail = buildPrayerResponseEmail({
          fullName: updated.fullName,
          subject: updated.subject,
          responseText: body.responseText,
        });
        const result = await sendResendEmail({
          to: updated.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          replyTo: 'office@avdheshanandg.org',
        });
        emailSent = result.success;
        if (!result.success) {
          emailError = result.skipped
            ? 'Email service not configured (RESEND_API_KEY missing).'
            : result.error || 'Resend could not deliver the email.';
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Contact submission updated successfully',
      // _emailSent/_emailError ride along inside data so the app can show an
      // accurate result (the client unwraps the response to `data`).
      data: { ...updated, _emailSent: emailSent, _emailError: emailError },
    });
  } catch (error) {
    console.error('Error updating contact submission:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update contact submission',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid ID format' }, { status: 400 });
    }

    const deleted = await Connect.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, lastActionAt: new Date(), status: 'archived' } },
      { new: true }
    ).lean();

    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Contact submission not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contact submission archived successfully',
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting contact submission:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete contact submission',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
