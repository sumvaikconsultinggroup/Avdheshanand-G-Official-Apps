/* eslint-disable @typescript-eslint/no-require-imports */
import { NextResponse } from 'next/server';
import Event from '@/models/Event';
import { connectDB } from '@/lib/mongodb';
import fs from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';

// Helper function to delete the old image file
async function deleteOldImage(imagePath) {
  try {
    // Skip if the path is empty or default image
    if (typeof imagePath !== 'string' || !/^\/uploads\/events\/[^/\\]+$/.test(imagePath)) {
      return false;
    }
    
    // Remove the leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    // Get absolute path
    const fullPath = path.join(process.cwd(), 'public', cleanPath);
    
    // Check if file exists
    if (fs.existsSync(fullPath)) {
      await unlink(fullPath);
      // console.log(`Successfully deleted old image: ${fullPath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete old image:', error);
    return false;
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { eventId } = await params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    // First fetch the existing event to get the current image path
    const existingEvent = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } });
    if (!existingEvent) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event not found',
        },
        { status: 404 }
      );
    }

    const formData = await req.formData();

    const eventName = formData.get('eventName');
    const eventDateStr = formData.get('eventDate');
    const eventLocation = formData.get('eventLocation');
    const description = formData.get('description');
    const eventImage = formData.get('eventImage');

    if (!eventName || !eventDateStr || !eventLocation || !description) {
      return NextResponse.json(
        {
          success: false,
          message: 'All fields are required',
        },
        { status: 400 }
      );
    }

    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid date format',
        },
        { status: 400 }
      );
    }

    const updateData = {
      eventName,
      eventDate,
      eventLocation,
      description,
    };

    const status = formData.get('publicationStatus');
    if (status !== null) {
      if (!['draft', 'published'].includes(status)) return NextResponse.json({ success: false, message: 'Invalid publication status' }, { status: 400 });
      updateData.publicationStatus = status;
    }

    // Handle image upload and old image deletion
    if (eventImage && eventImage.size > 0) {
      const { writeFile, mkdir } = require('fs/promises');
      const path = require('path');

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'events');
      const filename = `${eventId}-${Date.now()}-${eventImage.name}`;
      const filepath = path.join(uploadDir, filename);

      await mkdir(uploadDir, { recursive: true });
      const bytes = await eventImage.arrayBuffer();
      await writeFile(filepath, Buffer.from(bytes));

      updateData.eventImage = `/uploads/events/${filename}`;
      // console.log(`New image uploaded: ${updateData.eventImage}`);
      
      // Delete the old image after successfully uploading the new one
      if (existingEvent.eventImage) {
        await deleteOldImage(existingEvent.eventImage);
      }
    }

    const updatedEvent = await Event.findOneAndUpdate({ _id: eventId, isDeleted: { $ne: true } }, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedEvent) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Event updated successfully',
        data: JSON.parse(JSON.stringify(updatedEvent)),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('UPDATE Event Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update event',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { eventId } = await params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    const event = await Event.findByIdAndUpdate(eventId, { isDeleted: true }, { new: true });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Event deleted successfully',
        data: JSON.parse(JSON.stringify(event)),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE Event Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete event',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { eventId } = await params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true }, publicationStatus: { $ne: 'draft' } }).select('-registeredUsers');

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Event retrieved successfully',
        data: JSON.parse(JSON.stringify(event)),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET Event Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve event',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// A publication change touches only this field, so a concurrent edit keeps its other values.
export async function PATCH(req, { params }) {
  const { eventId } = await params;
  const body = await req.json().catch(() => null);
  if (!/^[a-f0-9]{24}$/i.test(eventId) || !['draft', 'published'].includes(body?.publicationStatus)) {
    return NextResponse.json({ success: false, message: 'Invalid event or publication status' }, { status: 400 });
  }
  await connectDB();
  const event = await Event.findOneAndUpdate(
    { _id: eventId, isDeleted: { $ne: true } },
    { $set: { publicationStatus: body.publicationStatus } },
    { new: true, runValidators: true }
  ).lean();
  return NextResponse.json({ success: Boolean(event), data: event }, { status: event ? 200 : 404 });
}
