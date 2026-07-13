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

function summarize(doc: any) {
  const p = doc.payload || {};
  const title =
    doc.mode === 'push'
      ? p.title || 'Push notification'
      : `Volunteer WhatsApp · ${p.cityName || 'city'}`;
  const subtitle = doc.mode === 'push' ? p.body || '' : p.eventName || p.message || '';
  return {
    _id: doc._id,
    mode: doc.mode,
    status: doc.status,
    scheduledAt: doc.scheduledAt,
    title,
    subtitle,
    audience: p.audience || null,
    cityName: p.cityName || null,
    hasImage: Boolean(p.imageUrl),
    createdByUsername: doc.createdByUsername || null,
    result: doc.result || null,
    error: doc.error || null,
  };
}

// List upcoming + recent broadcasts.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }
  try {
    await connectDB();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const docs = await ScheduledBroadcastModel.find({
      $or: [{ status: { $in: ['pending', 'sending'] } }, { updatedAt: { $gte: weekAgo } }],
    })
      .sort({ scheduledAt: -1 })
      .limit(60)
      .lean();

    return NextResponse.json({ success: true, data: docs.map(summarize) });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to load scheduled broadcasts' },
      { status: 500 }
    );
  }
}
