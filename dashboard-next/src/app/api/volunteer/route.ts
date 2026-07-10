import { NextRequest, NextResponse } from 'next/server';
import Volunteer, { IVolunteer } from '@/models/Volunteer';
import { connectDB } from '@/lib/mongodb';
import { sendResendEmail, buildVolunteerConfirmationEmail } from '@/utils/resendMailer';
import { v2 as cloudinary } from 'cloudinary';

type ApiResponse = {
  success: boolean;
  message: string;
  data?: IVolunteer | IVolunteer[] | null;
  error?: string;
  validationErrors?: Record<string, string>;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'volunteer-profiles',
        resource_type: 'auto', // Supports images and PDFs
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '0', 10), 100);
    const search = url.searchParams.get('search') || '';
    const approved = url.searchParams.get('approved');

    const filter: Record<string, unknown> = { isDeleted: false };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }, { city: regex }];
    }
    if (approved === 'true') filter.isApproved = true;
    if (approved === 'false') filter.isApproved = { $ne: true };

    // Paginated response
    if (page > 0 && limit > 0) {
      const skip = (page - 1) * limit;
      const [volunteers, total] = await Promise.all([
        Volunteer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Volunteer.countDocuments(filter),
      ]);
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json(
        {
          success: true,
          message: 'Volunteers fetched successfully',
          data: volunteers as unknown as IVolunteer[],
          meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        },
        {
          status: 200,
          headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30', 'X-Total-Count': String(total) },
        }
      );
    }

    // Legacy: return all volunteers
    const volunteers = await Volunteer.find(filter).sort({ createdAt: -1 }).lean();

    if (!volunteers?.length) {
      return NextResponse.json(
        { success: true, message: 'No volunteers found', data: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Volunteers fetched successfully',
        data: volunteers as unknown as IVolunteer[],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('GET Volunteers Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch volunteers',
      },
      { status: 500 }
    );
  }
}

// POST create new volunteer
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();

    const contentType = req.headers.get('content-type') || '';
    let profileUrl: string | undefined;
    const toArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];

    let data: {
      fullName: string; email: string; phone: string; age: string;
      occupationType: string; occupation: string; availability: string[];
      availableFrom: string; availableUntil: string; skills: string[];
      motivation: string; experience: string; consent: boolean;
      profile?: string; city: string; state: string; country: string; zip: string;
      maritalStatus: string; gender: string; highestEducation: string;
      hoursAvailable: string | null;
    };

    if (contentType.includes('application/json')) {
      // Mobile app submits JSON (no profile upload). Map the app's fields and
      // accept arrays directly. `name`/`message` are accepted as aliases.
      const body = await req.json();
      data = {
        fullName: String(body.fullName || body.name || ''),
        email: String(body.email || ''),
        phone: String(body.phone || ''),
        age: String(body.age ?? ''),
        occupationType: String(body.occupationType || ''),
        occupation: String(body.occupation || ''),
        availability: toArray(body.availability),
        availableFrom: String(body.availableFrom || ''),
        availableUntil: String(body.availableUntil || ''),
        skills: toArray(body.skills),
        motivation: String(body.motivation || body.message || ''),
        experience: String(body.experience || ''),
        consent: body.consent === true || body.consent === 'true',
        city: String(body.city || ''),
        state: String(body.state || ''),
        country: String(body.country || ''),
        zip: String(body.zip || ''),
        maritalStatus: String(body.maritalStatus || ''),
        gender: String(body.gender || ''),
        highestEducation: String(body.highestEducation || ''),
        hoursAvailable: body.hoursAvailable ? JSON.stringify(body.hoursAvailable) : null,
      };
    } else {
      const formData = await req.formData();
      // Extract file if present
      const profileFile = formData.get('profile') as File | null;

      // Upload profile to Cloudinary if provided
      if (profileFile && profileFile.size > 0) {
        if (profileFile.size > 5 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, message: 'Profile file size must be less than 5MB' },
            { status: 400 }
          );
        }
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(profileFile.type)) {
          return NextResponse.json(
            { success: false, message: 'Profile must be an image (JPG, PNG, WEBP) or PDF file' },
            { status: 400 }
          );
        }
        try {
          profileUrl = await uploadToCloudinary(profileFile);
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return NextResponse.json(
            { success: false, message: 'Failed to upload profile file' },
            { status: 500 }
          );
        }
      }

      data = {
        fullName: formData.get('fullName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        age: formData.get('age') as string,
        occupationType: formData.get('occupationType') as string,
        occupation: formData.get('occupation') as string,
        availability: JSON.parse((formData.get('availability') as string) || '[]'),
        availableFrom: formData.get('availableFrom') as string,
        availableUntil: formData.get('availableUntil') as string,
        skills: JSON.parse((formData.get('skills') as string) || '[]'),
        motivation: formData.get('motivation') as string,
        experience: formData.get('experience') as string,
        consent: formData.get('consent') === 'true',
        profile: profileUrl,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        country: formData.get('country') as string,
        zip: formData.get('zip') as string,
        maritalStatus: formData.get('maritalStatus') as string,
        gender: formData.get('gender') as string,
        highestEducation: formData.get('highestEducation') as string,
        hoursAvailable: formData.get('hoursAvailable') as string | null,
      };
    }

    // Required fields validation
    const requiredFields = [
      'fullName',
      'email',
      'phone',
      'age',
      'occupationType',
      'availability',
      'skills',
      'motivation',
      'consent',
    ];

    const missingFields = requiredFields.filter(
      (field) => !(data as Record<string, unknown>)[field]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate consent
    if (data.consent !== true) {
      return NextResponse.json(
        {
          success: false,
          message: 'Consent is required to proceed',
        },
        { status: 400 }
      );
    }

    // Validate age
    const age = Number(data.age);
    if (isNaN(age) || age < 18 || age > 100) {
      return NextResponse.json(
        {
          success: false,
          message: 'Age must be between 18 and 100',
        },
        { status: 400 }
      );
    }

    // Validate motivation length
    if (data.motivation.length < 50) {
      return NextResponse.json(
        {
          success: false,
          message: 'Motivation should be at least 50 characters long',
        },
        { status: 400 }
      );
    }

    // Validate availability array
    if (!Array.isArray(data.availability) || data.availability.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'At least one availability option must be selected',
        },
        { status: 400 }
      );
    }

    // Validate skills array
    if (!Array.isArray(data.skills) || data.skills.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'At least one skill must be selected',
        },
        { status: 400 }
      );
    }

    // Validate occupation based on occupationType
    if (
      data.occupationType &&
      data.occupationType !== 'unemployed' &&
      data.occupationType !== 'retired' &&
      data.occupationType !== 'student'
    ) {
      if (!data.occupation || data.occupation.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            message: 'Occupation is required unless occupation type is unemployed, retired, or student',
          },
          { status: 400 }
        );
      }
    }

    // Parse dates if provided
    let availableFrom: Date | undefined;
    let availableUntil: Date | undefined;

    if (data.availableFrom) {
      availableFrom = new Date(data.availableFrom);
      if (availableFrom < new Date()) {
        return NextResponse.json(
          {
            success: false,
            message: 'Available from date cannot be in the past',
          },
          { status: 400 }
        );
      }
    }

    if (data.availableUntil) {
      availableUntil = new Date(data.availableUntil);
      if (availableFrom && availableUntil <= availableFrom) {
        return NextResponse.json(
          {
            success: false,
            message: 'Available until date must be after available from date',
          },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingVolunteer = await Volunteer.findOne({ 
      email: data.email, 
      isDeleted: false 
    });
    
    if (existingVolunteer) {
      return NextResponse.json(
        {
          success: false,
          message: 'A volunteer with this email already exists',
        },
        { status: 409 }
      );
    }

    // Extract and validate hoursAvailable
    let hoursAvailableObj: { hours: number; period: 'day' | 'week' | 'month' } | undefined;
    if (data.hoursAvailable) {
      try {
        const parsed = JSON.parse(data.hoursAvailable);
        if (parsed.hours !== undefined && parsed.period) {
          hoursAvailableObj = {
            hours: Number(parsed.hours),
            period: parsed.period,
          };
        }
      } catch {
        console.error('Could not parse hoursAvailable JSON string:', data.hoursAvailable);
      }
    }


    // Create volunteer
    const volunteer = new Volunteer({
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      age: data.age,
      profile: profileUrl, // Store Cloudinary URL
      occupationType: data.occupationType.trim(),
      occupation: data.occupation ? data.occupation.trim() : undefined,
      availability: data.availability,
      availableFrom: availableFrom,
      availableUntil: availableUntil,
      skills: data.skills,
      motivation: data.motivation.trim(),
      experience: data.experience ? data.experience.trim() : undefined,
      consent: data.consent,
      city: data.city ? data.city.trim() : undefined,
      state: data.state ? data.state.trim() : undefined,
      country: data.country ? data.country.trim() : undefined,
      zip: data.zip ? data.zip.trim() : undefined,
      maritalStatus: data.maritalStatus ? data.maritalStatus.trim() : undefined,
      gender: data.gender ? data.gender.trim() : undefined,
      highestEducation: data.highestEducation ? data.highestEducation.trim() : undefined,
      hoursAvailable: hoursAvailableObj, // Add the new field
    });

    // Save to database
    await volunteer.save();

    // Send a branded confirmation email via Resend. Non-blocking and guarded:
    // a failure here must never fail the registration, and the helper no-ops
    // when RESEND_API_KEY is not configured.
    try {
      const fullLocation = [volunteer.city, volunteer.state, volunteer.country]
        .filter(Boolean)
        .join(', ');
      const confirmation = buildVolunteerConfirmationEmail({
        fullName: volunteer.fullName,
        skills: volunteer.skills,
        location: fullLocation,
      });
      await sendResendEmail({
        to: volunteer.email,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
        replyTo: process.env.CONTACT_NOTIFY_EMAIL || 'office@avdheshanandg.org',
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Volunteer application submitted successfully',
        data: volunteer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST Volunteer Error:', error);

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
        message: 'Failed to submit volunteer application',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
