import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { connectDB } from '@/lib/mongodb';
import NotificationPreference from '@/models/NotificationPreference';
import Volunteer from '@/models/Volunteer';
import Event from '@/models/Event';
import { sendWhatsAppMessage, sendWhatsAppTemplateMessage } from '@/lib/whatsapp';

const NotificationPreferenceModel = NotificationPreference as any;

function ensureFirebaseAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_ADMIN_SDK_JSON;
  if (!raw) throw new Error('FIREBASE_ADMIN_SDK_JSON is not configured');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const mode = body.mode || 'push';

    if (mode === 'push') {
      if (!body.title || !body.body) {
        return NextResponse.json({ success: false, message: 'Title and body are required' }, { status: 400 });
      }

      const preferenceFilter: Record<string, unknown> = { isActive: true };
      if (body.audience === 'city_followers' && body.cityName) {
        preferenceFilter.cityName = new RegExp(String(body.cityName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }

      const preferences = await NotificationPreferenceModel.find(preferenceFilter).lean();
      const tokens = preferences
        .map((item: any) => (typeof item.pushToken === 'string' ? item.pushToken : null))
        .filter((token: string | null): token is string => Boolean(token));

      if (!tokens.length) {
        return NextResponse.json({
          success: true,
          message:
            'No devotee devices are registered for notifications yet, so nothing was sent. Ask users to enable notifications in the app.',
          data: { audienceCount: 0, pushSent: 0 },
        });
      }

      // The user app registers EXPO push tokens (ExponentPushToken[...]). Those
      // must go through the Expo Push service, not Firebase. Any non-Expo token
      // is treated as a native FCM token and only sent if Firebase is configured.
      const isExpoToken = (t: string) =>
        t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[');
      const expoTokens = tokens.filter(isExpoToken);
      const fcmTokens = tokens.filter((t: string) => !isExpoToken(t));

      let pushSent = 0;
      const errors: string[] = [];

      // ── Expo Push API (no server key required) ──
      if (expoTokens.length) {
        const expoHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (process.env.EXPO_ACCESS_TOKEN) {
          expoHeaders.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
        }
        for (const tokenChunk of chunk<string>(expoTokens, 100)) {
          const messages = tokenChunk.map((to) => ({
            to,
            title: String(body.title),
            body: String(body.body),
            sound: 'default',
            channelId: 'general_announcements',
            priority: 'high',
            ...(body.data && typeof body.data === 'object' ? { data: body.data } : {}),
          }));
          try {
            const res = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: expoHeaders,
              body: JSON.stringify(messages),
            });
            const json = await res.json();
            const tickets = Array.isArray(json?.data) ? json.data : [];
            for (const ticket of tickets) {
              if (ticket?.status === 'ok') pushSent += 1;
              else errors.push(ticket?.message || 'expo-ticket-error');
            }
          } catch {
            errors.push('expo-request-failed');
          }
        }
      }

      // ── Firebase FCM (only if native tokens exist AND Firebase is configured) ──
      if (fcmTokens.length && process.env.FIREBASE_ADMIN_SDK_JSON) {
        try {
          ensureFirebaseAdmin();
          for (const tokenChunk of chunk<string>(fcmTokens, 500)) {
            const result = await admin.messaging().sendEachForMulticast({
              tokens: tokenChunk,
              notification: {
                title: String(body.title),
                body: String(body.body),
                ...(body.imageUrl ? { imageUrl: String(body.imageUrl) } : {}),
              },
              data: body.data && typeof body.data === 'object' ? body.data : {},
              android: {
                priority: 'high',
                notification: { channelId: 'general_announcements', priority: 'max', sound: 'default' },
              },
              apns: { payload: { aps: { sound: 'default', badge: 1 } } },
            });
            pushSent += result.successCount;
          }
        } catch {
          errors.push('fcm-send-failed');
        }
      } else if (fcmTokens.length) {
        errors.push(`${fcmTokens.length} native tokens skipped (Firebase not configured)`);
      }

      return NextResponse.json({
        success: true,
        message: pushSent
          ? 'Push broadcast sent successfully'
          : 'Reached the devices but none accepted the push. See errors for details.',
        data: {
          audienceCount: tokens.length,
          pushSent,
          audience: body.audience || 'all_followers',
          cityName: body.cityName || null,
          ...(errors.length ? { errors: errors.slice(0, 5) } : {}),
        },
      });
    }

    if (mode === 'volunteer_whatsapp') {
      const cityName = String(body.cityName || '').trim();
      const customMessage = String(body.message || '').trim();

      if (!cityName) {
        return NextResponse.json({ success: false, message: 'City is required for volunteer outreach' }, { status: 400 });
      }

      let event = null;
      if (body.eventId) {
        event = await Event.findOne({ _id: body.eventId, isDeleted: { $ne: true } }).lean();
      }

      // Volunteers store their place in `location` (there is no `city` field);
      // match either so it works regardless of schema drift.
      const cityRegex = new RegExp(cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const volunteers = await Volunteer.find({
        isDeleted: false,
        isApproved: true,
        $or: [{ location: cityRegex }, { city: cityRegex }],
      }).lean();

      if (!volunteers.length) {
        return NextResponse.json({
          success: true,
          message: 'No approved volunteers found for the selected city',
          data: { cityName, matchedVolunteers: 0, whatsappSent: 0 },
        });
      }

      const templateName = process.env.WHATSAPP_VOLUNTEER_EVENT_TEMPLATE;
      let sent = 0;
      const failures: string[] = [];

      for (const volunteer of volunteers) {
        const eventDate = body.eventDate || event?.eventDate;
        const eventLocation = body.eventLocation || event?.eventLocation || cityName;
        const eventName = body.eventName || event?.eventName || 'Ashram Seva';
        const message = customMessage || `Hari Om ${volunteer.fullName}. With blessings, you are requested to be present for ${eventName}${eventDate ? ` on ${new Date(eventDate).toLocaleString('en-IN')}` : ''} at ${eventLocation}. Kindly confirm your availability with the Ashram team. Pranams, AvdheshanandG Mission Team`;

        const result = templateName
          ? await sendWhatsAppTemplateMessage({
              to: volunteer.phone,
              templateName,
              bodyValues: [
                volunteer.fullName,
                eventName,
                eventDate ? new Date(eventDate).toLocaleString('en-IN') : 'the scheduled time',
                eventLocation,
              ],
              callbackData: 'volunteer_city_event_broadcast',
            })
          : await sendWhatsAppMessage(volunteer.phone, message);

        if (result.success) {
          sent += 1;
        } else {
          failures.push(`${volunteer.fullName}: ${result.error || 'send-failed'}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: sent ? 'Volunteer WhatsApp outreach queued successfully' : 'Volunteer outreach could not be delivered',
        data: {
          cityName,
          matchedVolunteers: volunteers.length,
          whatsappSent: sent,
          failures,
        },
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid broadcast mode' }, { status: 400 });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send broadcast',
      },
      { status: 500 }
    );
  }
}
