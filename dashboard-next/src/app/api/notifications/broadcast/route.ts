import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ScheduledBroadcast from '@/models/ScheduledBroadcast';
import { verifyJwtToken } from '@/utils/verifyJwtToken';
import { runBroadcast, resolveBroadcastImageUrl } from '@/lib/broadcasts';

async function getAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : undefined;
  const token = bearer || req.cookies.get('auth_token')?.value || req.cookies.get('token')?.value;
  if (!token) return null;
  const payload = await verifyJwtToken(token).catch(() => null);
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as any;
  return {
    adminId: typeof p.adminId === 'string' ? p.adminId : typeof p._id === 'string' ? p._id : '',
    username: typeof p.username === 'string' ? p.username : typeof p.name === 'string' ? p.name : 'Admin',
  };
}

function validate(mode: string, body: any): string | null {
  if (mode === 'push') {
    if (!body.title || !body.body) return 'Title and body are required';
  } else if (mode === 'volunteer_whatsapp') {
    if (!String(body.cityName || '').trim()) return 'City is required for volunteer outreach';
  } else {
    return 'Invalid broadcast mode';
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const mode = body.mode || 'push';

    const validationError = validate(mode, body);
    if (validationError) {
      return NextResponse.json({ success: false, message: validationError }, { status: 400 });
    }

    // ── Scheduled for later? Store it (upload the image once now) and let the
    //    cron processor send it at the scheduled time. ──
    if (body.scheduledAt) {
      const scheduledAt = new Date(body.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ success: false, message: 'Invalid schedule time' }, { status: 400 });
      }
      // 30s grace: anything further out is stored; sooner just sends now.
      if (scheduledAt.getTime() > Date.now() + 30 * 1000) {
        const imageUrl = await resolveBroadcastImageUrl(body);
        // Drop the heavy base64 + control fields before persisting the payload.
        const { imageBase64, scheduledAt: _s, mode: _m, ...rest } = body;
        void imageBase64;
        void _s;
        void _m;
        const admin = await getAdmin(req);
        const doc = await ScheduledBroadcast.create({
          mode,
          payload: { ...rest, ...(imageUrl ? { imageUrl } : {}) },
          scheduledAt,
          status: 'pending',
          createdByAdminId: admin?.adminId,
          createdByUsername: admin?.username,
        });
        return NextResponse.json({
          success: true,
          message: `Broadcast scheduled for ${scheduledAt.toLocaleString('en-IN')}`,
          data: { scheduled: true, id: doc._id, scheduledAt },
        });
      }
    }

    // ── Immediate send ──
    const result = await runBroadcast(mode, body);
    return NextResponse.json(
      { success: result.success, message: result.message, data: result.data },
      { status: result.success ? 200 : 400 }
    );
  } catch (error) {
    console.error('Broadcast notification error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}
