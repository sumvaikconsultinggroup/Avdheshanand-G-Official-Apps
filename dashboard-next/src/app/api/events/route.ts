import { listEvents } from '@/lib/eventList';
import { NextRequest, NextResponse } from 'next/server';
import Event from '@/models/Event';
import { connectDB } from '@/lib/mongodb';
import getCloudinary from '@/utils/cloudinary';
import { UploadApiResponse } from 'cloudinary';

// API Response type
type ApiResponse = {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
};



// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file: File): Promise<string> => {
  try {
    // Convert file to buffer for Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary with specific folder and options
    const cloudinary = getCloudinary();
    const cloudinaryResponse: UploadApiResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'events',
            resource_type: 'image',
            transformation: [
              { width: 1200, height: 630, crop: 'fill', gravity: 'auto' }, // Standard event image size
              { quality: 'auto:good' }
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as UploadApiResponse);
          }
        )
        .end(buffer);
    });

    // Return the secure URL
    return cloudinaryResponse.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export async function GET(req: NextRequest) {
  return listEvents(req, false);
}

// POST create new event
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    await connectDB();
    const form = await req.formData();

    // Get form data
    const data = {
      eventName: form.get('eventName') as string,
      eventDate: new Date(form.get('eventDate') as string),
      eventLocation: form.get('eventLocation') as string,
      description: form.get('description') as string,
      file: form.get('eventImage') as File,
    };

    const publicationStatus = form.get('publicationStatus') ?? 'published';
    if (publicationStatus !== 'published' && publicationStatus !== 'draft') {
      return NextResponse.json({ success: false, message: 'Invalid publication status' }, { status: 400 });
    }

    // Basic validation
    if (!data.eventName || !data.eventLocation || !data.description) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event name, location, and description are required',
        },
        { status: 400 }
      );
    }

    if (isNaN(data.eventDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid date format',
        },
        { status: 400 }
      );
    }

    // Set default image path
    let eventImagePath = '/images/swamiji-hero.jpg';

    // Handle file upload if provided
    if (data.file && data.file.size > 0) {
      // Validate file type
      if (!data.file.type.startsWith('image/')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Event image must be an image file',
          },
          { status: 400 }
        );
      }

      try {
        // Upload to Cloudinary
        eventImagePath = await uploadToCloudinary(data.file);
      } catch (uploadError) {
        console.error('Error uploading event image:', uploadError);
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to upload event image',
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Create event
    const newEvent = await Event.create({
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventLocation: data.eventLocation,
      description: data.description,
      eventImage: eventImagePath,
      publicationStatus,
      registeredUsers: [],
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Event created successfully',
        data: newEvent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST Event Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create event',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
