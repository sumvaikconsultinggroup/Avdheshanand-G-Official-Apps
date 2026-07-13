import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { resolveUserApiBaseUrl } from './api';

// Storage keys shared with the Panchang notification-preferences screen so the
// token and the user's saved preferences stay in sync across the app.
const STORAGE_KEY_PUSH_TOKEN = '@push_notification_token';
const STORAGE_KEY_NOTIF = '@panchang_notification_prefs';
const STORAGE_KEY_CITY = '@panchang_selected_city';

// EAS project id is required by getExpoPushTokenAsync() in real builds; it is
// injected into expo config by `eas init`.
const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as any)?.easConfig?.projectId;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });

    // Panchang daily channel
    await Notifications.setNotificationChannelAsync('panchang_daily', {
      name: 'Daily Panchang',
      description: 'Daily Panchang alerts at Brahma Muhurta time',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });

    // Festival alerts channel
    await Notifications.setNotificationChannelAsync('festival_alerts', {
      name: 'Festival Alerts',
      description: 'Notifications for upcoming Hindu festivals',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    // General announcements channel — the dashboard broadcast targets this
    // channelId, so it must exist or Android announcement pushes won't display.
    await Notifications.setNotificationChannelAsync('general_announcements', {
      name: 'Announcements',
      description: 'Messages and announcements from the Ashram',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });

    // Schedule & registration updates — the backend (scheduleNotifications)
    // sends Swami Ji schedule changes and registration status to this channel.
    await Notifications.setNotificationChannelAsync('schedule_updates', {
      name: 'Schedule & Darshan Updates',
      description: "Swami Ji's schedule changes and your registration updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const token = (
    await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined
    )
  ).data;
  return token;
}

/**
 * POST a push token (plus the device's saved language/city) to the backend so
 * the dashboard broadcast can reach this device. Failures are swallowed — a
 * missing server sync should never break the UI. Returns true on success.
 */
export async function syncPushTokenToServer(token: string): Promise<boolean> {
  try {
    const [storedPrefs, storedCity] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_NOTIF),
      AsyncStorage.getItem(STORAGE_KEY_CITY),
    ]);
    const prefs = storedPrefs ? JSON.parse(storedPrefs) : {};
    const city = storedCity
      ? JSON.parse(storedCity)
      : { name: 'Haridwar', lat: 29.9457, lng: 78.1642, timezone: 'Asia/Kolkata' };

    const baseUrl = await resolveUserApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/notifications/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pushToken: token,
        platform: Platform.OS,
        language: prefs.language || 'hi',
        cityName: city.name,
        lat: city.lat,
        lng: city.lng,
        timezone: city.timezone || 'Asia/Kolkata',
        dailyPanchang: prefs.dailyPanchang !== undefined ? prefs.dailyPanchang : true,
        festivalAlerts: prefs.festivalAlerts !== undefined ? prefs.festivalAlerts : true,
        brahmaMuhurtaAlert:
          prefs.brahmaMuhurtaAlert !== undefined ? prefs.brahmaMuhurtaAlert : true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Re-push the current stored city (and prefs) to the backend for the already-
 * registered device, so the notification preference's `cityName` stays in sync
 * whenever the user changes their location. Without this the server keeps the
 * city that was stored when notifications were first enabled (often the default),
 * which breaks city-targeted broadcasts. No-op if notifications were never enabled.
 */
export async function resyncPushTokenPreferences(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEY_PUSH_TOKEN);
    if (token) await syncPushTokenToServer(token);
  } catch {
    // best-effort — a failed re-sync must never block a city change
  }
}

/**
 * Register for push (prompting for permission if needed), persist the token
 * locally, and sync it to the backend. Returns the token or null.
 */
export async function registerAndSyncPushToken(): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (!token) return null;
  await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, token);
  await syncPushTokenToServer(token);
  return token;
}

/**
 * Silent refresh for app startup: only acts if notification permission was
 * ALREADY granted (never prompts). Re-fetches the Expo token — which can rotate
 * between launches — and re-syncs it so previously-enabled devices stay
 * registered on the server. No-op on emulators or when permission isn't granted.
 */
export async function refreshPushTokenIfEnabled(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const token = (
      await Notifications.getExpoPushTokenAsync(
        EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined
      )
    ).data;
    if (!token) return;
    await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, token);
    await syncPushTokenToServer(token);
  } catch {
    // Startup token refresh is best-effort.
  }
}

/**
 * Schedule a local notification for Brahma Muhurta (4:30 AM daily).
 * This is a fallback for when Firebase is not available.
 */
export async function scheduleBrahmaMuhurtaReminder(): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Brahma Muhurta',
        body: 'The most auspicious time for meditation and spiritual practice has begun.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 4,
        minute: 30,
      },
    });
    return identifier;
  } catch (error) {
    console.warn('Failed to schedule Brahma Muhurta reminder:', error);
    return null;
  }
}

/**
 * Cancel Brahma Muhurta reminder
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
