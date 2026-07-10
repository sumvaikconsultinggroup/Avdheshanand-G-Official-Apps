import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';
import User from '@/models/User';
import { sendEmail } from '@/utils/sendEmail';

// Helper functions for API responses
function errorResponse(message, status = 500, error) {
  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return NextResponse.json(response, { status });
}

function successResponse(message, data = null, status = 200) {
  const response = {
    success: true,
    message,
  };

  if (data) {
    response.data = data;
  }

  return NextResponse.json(response, { status });
}

export async function POST(req) {
  try {
    await connectDB();

    // Parse request body
    const { userId, eventId } = await req.json();

    // Validate input
    if (!userId || !eventId) {
      return errorResponse('Both userId and eventId are required', 400);
    }

    // Validate MongoDB IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(eventId)) {
      return errorResponse('Invalid userId or eventId format', 400);
    }

    // Check user
    const user = await User.findById(userId);

    // Check event
    const event = await Event.findById(eventId);

    // Check if the user and event exist
    if (!user || !event) {
      return errorResponse('User or Event not found', 404);
    }

    // Check if user is already registered for this event - need to convert ObjectIds to strings for comparison
    if (event.registeredUsers && event.registeredUsers.some(id => id.toString() === userId)) {
      return errorResponse('You are already registered for this event', 400);
    }

    // Initialize arrays if they don't exist
    if (!user.registeredEvents) {
      user.registeredEvents = [];
    }

    if (!event.registeredUsers) {
      event.registeredUsers = [];
    }

    // Register user for event (in both collections)
    user.registeredEvents.push(eventId);
    event.registeredUsers.push(userId);

    // Save both documents using Promise.all for better performance
    await Promise.all([user.save(), event.save()]);

    // Format event date for email
    let eventDate = 'TBD';
    if (event.eventDate) {
      try {
        eventDate = new Date(event.eventDate).toLocaleDateString();
      } catch (e) {
        console.error('Error formatting date:', e);
      }
    }

    // Verify user has email
    if (!user.email) {
      console.warn('User has no email address:', userId);
      return successResponse('Registration successful but user has no email address');
    }

    // Send confirmation email
    const emailSubject = `[Sumvaik] Registration Confirmed: ${event.eventName}`;
    const emailText = `Hi ${user.username || user.name || 'there'},

You have successfully registered for ${event.eventName}.
Event Date: ${eventDate}

Regards,
Sumvaik Team`;

    // HTML version for better formatting
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Registration Confirmation</h2>
        <p>Hi ${user.username || user.name || 'there'},</p>
        <p>You have successfully registered for <strong>${event.eventName}</strong>.</p>
        <p>Event Date: <strong>${eventDate}</strong></p>
        <p>Regards,<br/>Sumvaik Team</p>
      </div>
    `;

    try {
      // console.log('Attempting to send email to:', user.email);

      await sendEmail(user.email, emailSubject, emailText, emailHtml);

      // console.log('Email sent successfully to:', user.email);
      return successResponse('Registration successful and confirmation email sent');
    } catch (emailError) {
      console.error('Email error details:', emailError);

      // Still return success but indicate email issue
      return successResponse('Registration successful but email notification failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Server error', 500, error.message);
  }
}

// Only allow POST requests to this endpoint
export async function GET() {
  return errorResponse('Method not allowed', 405);
}
