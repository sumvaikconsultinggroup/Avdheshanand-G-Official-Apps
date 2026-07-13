import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ScheduledBroadcast from '@/models/ScheduledBroadcast';
import { runBroadcast } from '@/lib/broadcasts';

const ScheduledBroadcastModel = ScheduledBroadcast as any;

// Processed per invocation — keeps each cron run well under the function timeout.
const BATCH_LIMIT = 15;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, allow (dev). In production, set CRON_SECRET.
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true; // Vercel Cron sends this header
  const url = new URL(req.url);
  return url.searchParams.get('secret') === secret; // manual/testing fallback
}

async function handleCron(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const now = new Date();
  const processed: Array<Record<string, unknown>> = [];

  for (let i = 0; i < BATCH_LIMIT; i += 1) {
    // Atomically claim the next due broadcast so overlapping runs can't double-send.
    const doc = await ScheduledBroadcastModel.findOneAndUpdate(
      { status: 'pending', scheduledAt: { $lte: now } },
      { $set: { status: 'sending' } },
      { sort: { scheduledAt: 1 }, new: true }
    );
    if (!doc) break; // nothing left due

    try {
      const result = await runBroadcast(doc.mode, doc.payload || {});
      doc.status = result.success ? 'sent' : 'failed';
      doc.result = result.data;
      if (!result.success) doc.error = result.message;
      doc.sentAt = new Date();
      await doc.save();
      processed.push({ id: doc._id, mode: doc.mode, status: doc.status });
    } catch (error) {
      doc.status = 'failed';
      doc.error = error instanceof Error ? error.message : 'Unknown error';
      doc.sentAt = new Date();
      await doc.save();
      processed.push({ id: doc._id, mode: doc.mode, status: 'failed' });
    }
  }

  return NextResponse.json({ success: true, processed: processed.length, items: processed });
}

// Vercel Cron uses GET; POST allowed for manual triggering.
export async function GET(req: NextRequest) {
  return handleCron(req);
}
export async function POST(req: NextRequest) {
  return handleCron(req);
}
