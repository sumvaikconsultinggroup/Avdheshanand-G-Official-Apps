import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ScheduledBroadcast from '@/models/ScheduledBroadcast';
import { verifyJwtToken } from '@/utils/verifyJwtToken';

const ScheduledBroadcastModel = ScheduledBroadcast as any;

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : undefined;
  const token = bearer || req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = await verifyJwtToken(token).catch(() => null);
  if (!payload || typeof payload !== 'object') return null;
  return payload as any;
}

// Cancel a still-pending scheduled broadcast.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }
  try {
    const { id } = await params;
    await connectDB();
    const updated = await ScheduledBroadcastModel.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: { status: 'cancelled' } },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Broadcast not found or already sent/cancelled' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: 'Scheduled broadcast cancelled' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to cancel' },
      { status: 500 }
    );
  }
}
