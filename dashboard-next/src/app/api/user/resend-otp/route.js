import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';
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
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return errorResponse("Email is required", 400);
    }

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) {
      return errorResponse("User not found", 404);
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    // Save raw OTP and let the model pre-save hook hash it once.
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    // Create HTML version of OTP email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Your OTP Verification Code (Resent)</h2>
        <p>Your new One-Time Password is:</p>
        <div style="background-color: #f7f7f7; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code is valid for 5 minutes.</p>
        <p style="color: #c00;"><strong>Do not share this code with anyone.</strong></p>
      </div>
    `;

    try {
      await sendEmail(
        email,
        "Your OTP Code (Resent)",
        `Your new OTP is: ${otp}\nValid for 5 minutes.\nDo not share this with anyone.`,
        htmlContent
      );
      
      console.log(`OTP resent successfully to: ${email}`);
      return successResponse("OTP resent successfully");
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      
      // Revert OTP save if email fails
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();
      
      return errorResponse("Failed to resend OTP email", 500, emailError.message);
    }
  } catch (error) {
    console.error("OTP Resend Error:", error);
    return errorResponse(
      "Failed to resend OTP", 
      500, 
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
}

// GET method not allowed
export async function GET() {
  return errorResponse("Method not allowed", 405);
}
