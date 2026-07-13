import admin from 'firebase-admin';
import NotificationPreference from '@/models/NotificationPreference';
import Volunteer from '@/models/Volunteer';
import Event from '@/models/Event';
import { sendWhatsAppMessage, sendWhatsAppTemplateMessage, sendWhatsAppImageMessage } from '@/lib/whatsapp';
import getCloudinary from '@/utils/cloudinary';

const NotificationPreferenceModel = NotificationPreference as any;

// Branded logo used as the WhatsApp header image when no custom image is attached.
export const BROADCAST_LOGO_URL =
  process.env.WHATSAPP_BROADCAST_LOGO_URL ||
  'https://avdheshanandg-dashboard.vercel.app/brand-logo.png';

// Cap the accepted broadcast image at ~3MB (base64 is ~4/3 of the byte size).
const MAX_IMAGE_BASE64_LENGTH = Math.ceil((3 * 1024 * 1024 * 4) / 3);

export type BroadcastResult = {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
};

/**
 * Upload a base64 broadcast image to Cloudinary (once) and return its URL. Falls
 * back to a provided imageUrl, or undefined. Never throws.
 */
export async function resolveBroadcastImageUrl(body: any): Promise<string | undefined> {
  if (typeof body.imageUrl === 'string' && body.imageUrl) return body.imageUrl;
  const b64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  if (!b64.startsWith('data:image')) return undefined;
  if (b64.length > MAX_IMAGE_BASE64_LENGTH) return undefined;
  try {
    const uploaded = await getCloudinary().uploader.upload(b64, {
      folder: 'broadcasts',
      resource_type: 'image',
    });
    return uploaded.secure_url;
  } catch (error) {
    console.error('Broadcast image upload failed:', error);
    return undefined;
  }
}

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

/** Send a push broadcast to all / city followers. */
export async function runPushBroadcast(body: any): Promise<BroadcastResult> {
  const imageUrl = await resolveBroadcastImageUrl(body);

  const preferenceFilter: Record<string, unknown> = { isActive: true };
  if (body.audience === 'city_followers' && body.cityName) {
    preferenceFilter.cityName = new RegExp(String(body.cityName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  const preferences = await NotificationPreferenceModel.find(preferenceFilter).lean();
  const tokens = preferences
    .map((item: any) => (typeof item.pushToken === 'string' ? item.pushToken : null))
    .filter((token: string | null): token is string => Boolean(token));

  if (!tokens.length) {
    return {
      success: true,
      message: 'No devotee devices are registered for notifications yet, so nothing was sent.',
      data: { audienceCount: 0, pushSent: 0 },
    };
  }

  const isExpoToken = (t: string) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[');
  const expoTokens = tokens.filter(isExpoToken);
  const fcmTokens = tokens.filter((t: string) => !isExpoToken(t));

  let pushSent = 0;
  const errors: string[] = [];

  if (expoTokens.length) {
    const expoHeaders: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (process.env.EXPO_ACCESS_TOKEN) expoHeaders.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    for (const tokenChunk of chunk<string>(expoTokens, 100)) {
      const messages = tokenChunk.map((to) => ({
        to,
        title: String(body.title),
        body: String(body.body),
        sound: 'default',
        channelId: 'general_announcements',
        priority: 'high',
        ...(imageUrl ? { richContent: { image: imageUrl } } : {}),
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

  if (fcmTokens.length && process.env.FIREBASE_ADMIN_SDK_JSON) {
    try {
      ensureFirebaseAdmin();
      for (const tokenChunk of chunk<string>(fcmTokens, 500)) {
        const result = await admin.messaging().sendEachForMulticast({
          tokens: tokenChunk,
          notification: {
            title: String(body.title),
            body: String(body.body),
            ...(imageUrl ? { imageUrl } : {}),
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

  return {
    success: true,
    message: pushSent ? 'Push broadcast sent successfully' : 'Reached the devices but none accepted the push.',
    data: {
      audienceCount: tokens.length,
      pushSent,
      audience: body.audience || 'all_followers',
      cityName: body.cityName || null,
      ...(errors.length ? { errors: errors.slice(0, 5) } : {}),
    },
  };
}

/** Send WhatsApp outreach to approved volunteers in a city. */
export async function runVolunteerWhatsApp(body: any): Promise<BroadcastResult> {
  const cityName = String(body.cityName || '').trim();
  const customMessage = String(body.message || '').trim();
  if (!cityName) {
    return { success: false, message: 'City is required for volunteer outreach', data: {} };
  }

  let event: any = null;
  if (body.eventId) {
    event = await Event.findOne({ _id: body.eventId, isDeleted: { $ne: true } }).lean();
  }

  const cityRegex = new RegExp(cityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const volunteers = await Volunteer.find({
    isDeleted: false,
    isApproved: true,
    $or: [{ location: cityRegex }, { city: cityRegex }],
  }).lean();

  if (!volunteers.length) {
    return {
      success: true,
      message: 'No approved volunteers found for the selected city',
      data: { cityName, matchedVolunteers: 0, whatsappSent: 0 },
    };
  }

  const templateName = process.env.WHATSAPP_VOLUNTEER_EVENT_TEMPLATE;
  const customImageUrl = await resolveBroadcastImageUrl(body);
  const whatsAppImageUrl = customImageUrl || BROADCAST_LOGO_URL;
  let sent = 0;
  const failures: string[] = [];

  for (const volunteer of volunteers as any[]) {
    const eventDate = body.eventDate || event?.eventDate;
    const eventLocation = body.eventLocation || event?.eventLocation || cityName;
    const eventName = body.eventName || event?.eventName || 'Ashram Seva';
    const dateStr = eventDate
      ? new Date(eventDate).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';
    const message =
      customMessage ||
      `🕉️ *Hari Om, ${volunteer.fullName}* 🙏\n\n` +
        `With divine blessings, you are lovingly invited to offer your *seva*:\n\n` +
        `📿 *${eventName}*` +
        `${dateStr ? `\n🗓️  ${dateStr}` : ''}` +
        `${eventLocation ? `\n📍  ${eventLocation}` : ''}\n\n` +
        `Your presence and selfless service mean a great deal to us. Kindly confirm your availability with the Ashram team. 🌸\n\n` +
        `_With gratitude & blessings,_\n*Swami Avdheshanand G*\n_Towards Divinity_`;

    const sendText = () =>
      templateName
        ? sendWhatsAppTemplateMessage({
            to: volunteer.phone,
            templateName,
            bodyValues: [volunteer.fullName, eventName, dateStr || 'the scheduled time', eventLocation],
            callbackData: 'volunteer_city_event_broadcast',
          })
        : sendWhatsAppMessage(volunteer.phone, message);

    let result = await sendWhatsAppImageMessage(volunteer.phone, whatsAppImageUrl, message);
    if (!result.success) result = await sendText();

    if (result.success) sent += 1;
    else failures.push(`${volunteer.fullName}: ${result.error || 'send-failed'}`);
  }

  return {
    success: true,
    message: sent ? 'Volunteer WhatsApp outreach queued successfully' : 'Volunteer outreach could not be delivered',
    data: { cityName, matchedVolunteers: volunteers.length, whatsappSent: sent, failures },
  };
}

/** Dispatch a stored/immediate broadcast by mode. */
export async function runBroadcast(mode: string, body: any): Promise<BroadcastResult> {
  if (mode === 'volunteer_whatsapp') return runVolunteerWhatsApp(body);
  return runPushBroadcast(body);
}
