import { NextRequest, NextResponse } from 'next/server';
import Event from '@/models/Event';
import { connectDB } from '@/lib/mongodb';

// GET all events (with optional pagination)
export async function listEvents(req: NextRequest, staff: boolean) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '0', 10), 100);
    const search = url.searchParams.get('search') || '';

    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };

    if (!staff) filter.publicationStatus = { $ne: 'draft' };
    const projection = staff ? '-__v' : '-__v -registeredUsers';

    // Optional text search
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ eventName: regex }, { description: regex }, { eventLocation: regex }];
    }

    // If pagination params are provided, use paginated response
    if (page > 0 && limit > 0) {
      const skip = (page - 1) * limit;
      const [events, total] = await Promise.all([
        Event.find(filter).sort({ eventDate: -1 }).skip(skip).limit(limit).select(projection).lean(),
        Event.countDocuments(filter),
      ]);

      const sanitizedEvents = JSON.parse(JSON.stringify(events));
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json(
        {
          success: true,
          message: 'Events fetched successfully',
          data: sanitizedEvents,
          meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        },
        {
          status: 200,
          headers: { 'Cache-Control': 'private, no-store', 'X-Total-Count': String(total) },
        }
      );
    }

    // Legacy: return all events (backward compatible)
    const events = await Event.find(filter)
      .sort({ eventDate: 1 })
      .select(projection)
      .lean();

    if (!events?.length) {
      return NextResponse.json(
        { success: true, message: 'No events found', data: [] },
        { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const sanitizedEvents = JSON.parse(JSON.stringify(events));

    return NextResponse.json(
      {
        success: true,
        message: 'Events fetched successfully',
        data: sanitizedEvents,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store',
        }
      }
    );
  } catch (error) {
    console.error('GET Events Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch events',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
