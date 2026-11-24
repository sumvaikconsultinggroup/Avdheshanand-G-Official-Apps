import { NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!isValidObjectId(eventId)) return NextResponse.json({ success: false }, { status: 400 });
  await connectDB();
  const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } }).lean();
  return NextResponse.json({ success: Boolean(event), data: event }, {
    status: event ? 200 : 404, headers: { 'Cache-Control': 'private, no-store' },
  });
}
