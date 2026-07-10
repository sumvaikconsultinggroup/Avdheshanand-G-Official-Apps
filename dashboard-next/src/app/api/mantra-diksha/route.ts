import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MantraDiksha, { IMantraDiksha } from '@/models/MantraDiksha';
import getCloudinary from '@/utils/cloudinary';
import { sendResendEmail, buildDikshaConfirmationEmail } from '@/utils/resendMailer';

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: IMantraDiksha[] | Partial<IMantraDiksha>[];
  error?: string;
}

interface ExistingRegistrationQuery {
  mobileNumber: string;
  isDeleted: boolean;
  $or?: Array<{ mobileNumber: string } | { aadhaarNumber: string } | { passportNumber: string } | { email: string }>;
}

interface RegistrationData {
  fullName: string;
  dateOfBirth: Date;
  gender: string;
  nationality: string;
  mobileNumber: string;
  email: string | null;
  whatsappNumber: string | null;
  spiritualIntent?: string | null;
  spiritualPath?: string | null;
  previousDiksha?: string | null;
  recentPhoto: string | null;
  registrationDate: Date;
  aadhaarNumber?: string;
  aadhaarDocument?: string | null;
  passportNumber?: string;
  passportDocument?: string | null;
}

// Helper function to upload file to Cloudinary. Returns the secure URL plus the
// public_id so the asset can be cleaned up if the registration later fails.
async function uploadToCloudinary(
  file: File,
  folder: string
): Promise<{ url: string; publicId: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const cloudinary = getCloudinary();
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'auto',
          folder: `mantra-diksha/${folder}`,
          transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({ url: result?.secure_url || '', publicId: result?.public_id || '' });
          }
        }
      )
      .end(buffer);
  });
}

// Best-effort cleanup of orphaned Cloudinary assets. Never throws — used when a
// registration fails after its documents were already uploaded, so that a failed
// submission leaves nothing behind (no DB record AND no stored documents).
async function deleteFromCloudinary(publicIds: string[]): Promise<void> {
  if (!publicIds.length) return;
  try {
    const cloudinary = getCloudinary();
    await Promise.all(
      publicIds.filter(Boolean).map((id) => cloudinary.uploader.destroy(id))
    );
  } catch (cleanupError) {
    console.error('Error cleaning up orphaned Cloudinary assets:', cleanupError);
  }
}

// GET - Fetch all Mantra Diksha registrations
export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const registrations = await MantraDiksha.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: registrations as unknown as IMantraDiksha[],
    });
  } catch (error) {
    console.error('Error fetching mantra diksha registrations:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch registrations',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Create new Mantra Diksha registration with file uploads
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const formData = await request.formData();
    // console.log('Received form data:', formData);

    // Extract common form data
    const fullName = formData.get('fullName') as string;
    const dateOfBirth = formData.get('dateOfBirth') as string;
    const gender = formData.get('gender') as string;
    const nationality = (formData.get('nationality') as string) || 'Indian';
    const mobileNumber = formData.get('mobileNumber') as string;
    const email = formData.get('email') as string;

    // Extract optional spiritual form data
    const spiritualIntent = formData.get('spiritualIntent') as string;
    const spiritualPath = formData.get('spiritualPath') as string;
    const previousDiksha = formData.get('previousDiksha') as string;

    // Extract optional form data
    const whatsappNumber = formData.get('whatsappNumber') as string;
    const aadhaarNumber = formData.get('aadhaarNumber') as string;
    const passportNumber = formData.get('passportNumber') as string;

    // Get files
    const aadhaarDocument = formData.get('aadhaarDocument') as File | null;
    const passportDocument = formData.get('passportDocument') as File | null;
    const recentPhoto = formData.get('recentPhoto') as File | null;

    // Debug log to check nationality value
    // console.log('Nationality received:', nationality, 'Type:', typeof nationality);

    // Validate common required fields
    const commonRequiredFields = {
      fullName,
      dateOfBirth,
      gender,
      mobileNumber,
      email,
    };

    const missingCommonFields = Object.entries(commonRequiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingCommonFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
          error: `Missing: ${missingCommonFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Normalize nationality for comparison
    const normalizedNationality = nationality.trim().toLowerCase();
    const isIndian = normalizedNationality === 'indian' || normalizedNationality === 'india';

    // console.log('Normalized nationality:', normalizedNationality, 'Is Indian:', isIndian);

    // Validate nationality-specific required fields
    if (isIndian) {
      const indianRequiredFields = {
        aadhaarNumber,
      };

      const missingIndianFields = Object.entries(indianRequiredFields)
        .filter(([, value]) => !value)
        .map(([key]) => key);

      if (missingIndianFields.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Missing required fields for Indian nationality',
            error: `Missing: ${missingIndianFields.join(', ')}`,
          },
          { status: 400 }
        );
      }

      if (!aadhaarDocument || aadhaarDocument.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Aadhaar document is required for Indian nationality',
          },
          { status: 400 }
        );
      }
    } else {
      // Non-Indian nationality
      if (!passportNumber) {
        return NextResponse.json(
          {
            success: false,
            message: 'Passport number is required for non-Indian nationality',
          },
          { status: 400 }
        );
      }

      if (!passportDocument || passportDocument.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Passport document is required for non-Indian nationality',
          },
          { status: 400 }
        );
      }
    }

    // Check if registration already exists
    const existingQuery: ExistingRegistrationQuery = { mobileNumber, isDeleted: false };

    if (isIndian && aadhaarNumber) {
      existingQuery.$or = [
        { mobileNumber },
        { aadhaarNumber },
        { email }
      ];
    } else if (!isIndian && passportNumber) {
      existingQuery.$or = [
        { mobileNumber },
        { passportNumber },
        { email }
      ];
    } else {
      existingQuery.$or = [
        { mobileNumber },
        { email }
      ];
    }

    const existingRegistration = await MantraDiksha.findOne(existingQuery);

    if (existingRegistration) {
      let conflictMessage = 'Registration already exists with this mobile number';
      if (isIndian) {
        conflictMessage += ', Aadhaar number, or email address';
      } else {
        conflictMessage += ', passport number, or email address';
      }
      
      return NextResponse.json(
        {
          success: false,
          message: conflictMessage,
        },
        { status: 409 }
      );
    }

    // Upload files to Cloudinary. Track public_ids so we can remove the assets
    // if the registration fails to save (no orphaned documents on failure).
    let aadhaarDocumentUrl = '';
    let passportDocumentUrl = '';
    let recentPhotoUrl = '';
    const uploadedPublicIds: string[] = [];

    try {
      // Upload Aadhaar document for Indian nationality
      if (isIndian && aadhaarDocument && aadhaarDocument.size > 0) {
        const result = await uploadToCloudinary(aadhaarDocument, 'aadhaar-documents');
        aadhaarDocumentUrl = result.url;
        if (result.publicId) uploadedPublicIds.push(result.publicId);
      }

      // Upload passport document for non-Indian nationality
      if (!isIndian && passportDocument && passportDocument.size > 0) {
        const result = await uploadToCloudinary(passportDocument, 'passport-documents');
        passportDocumentUrl = result.url;
        if (result.publicId) uploadedPublicIds.push(result.publicId);
      }

      // Upload recent photo (optional for all)
      if (recentPhoto && recentPhoto.size > 0) {
        const result = await uploadToCloudinary(recentPhoto, 'photos');
        recentPhotoUrl = result.url;
        if (result.publicId) uploadedPublicIds.push(result.publicId);
      }
    } catch (uploadError) {
      console.error('Error uploading files:', uploadError);
      // Roll back any document that did upload before the failure.
      await deleteFromCloudinary(uploadedPublicIds);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to upload documents',
          error: uploadError instanceof Error ? uploadError.message : 'Upload error',
        },
        { status: 500 }
      );
    }

    // Prepare registration data
    const registrationData: RegistrationData = {
      fullName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      nationality: isIndian ? 'Indian' : nationality,
      mobileNumber,
      email: email || null,
      whatsappNumber: whatsappNumber || null,
      spiritualIntent: spiritualIntent || null,
      spiritualPath: spiritualPath || null,
      previousDiksha: previousDiksha || null,
      recentPhoto: recentPhotoUrl || null,
      registrationDate: new Date(),
    };

    // Add nationality-specific fields
    if (isIndian) {
      registrationData.aadhaarNumber = aadhaarNumber;
      registrationData.aadhaarDocument = aadhaarDocumentUrl || null;
    } else {
      registrationData.passportNumber = passportNumber;
      registrationData.passportDocument = passportDocumentUrl || null;
    }

    // Create new registration. If the save fails, remove the just-uploaded
    // documents so a failed submission never leaves orphaned files behind.
    const newRegistration = new MantraDiksha(registrationData);
    let savedRegistration;
    try {
      savedRegistration = await newRegistration.save();
    } catch (saveError) {
      await deleteFromCloudinary(uploadedPublicIds);
      throw saveError;
    }

    // Send a branded confirmation email via Resend. Non-blocking: a failure
    // here must never fail the registration, and the helper no-ops when
    // RESEND_API_KEY is not configured.
    if (email) {
      const confirmation = buildDikshaConfirmationEmail({
        fullName,
        registrationDate: registrationData.registrationDate,
      });
      sendResendEmail({
        to: email,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
        replyTo: process.env.CONTACT_NOTIFY_EMAIL || 'office@avdheshanandg.org',
      })
        .then((res) => {
          if (res.success) console.log('✅ Diksha confirmation email sent');
          else if (res.skipped) console.log('⚠️ Diksha email skipped (no RESEND_API_KEY)');
          else console.log('⚠️ Diksha email not sent:', res.error);
        })
        .catch((error) => console.error('❌ Error sending diksha email:', error));
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted successfully! A confirmation email has been sent to your email address.',
        data: [savedRegistration],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating mantra diksha registration:', error);

    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create registration',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
