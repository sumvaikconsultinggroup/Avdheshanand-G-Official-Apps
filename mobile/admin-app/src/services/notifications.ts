import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

const ADMIN_PUSH_TOKEN_KEY = '@admin_push_notification_token';

// EAS project id — required by getExpoPushTokenAsync() in real builds. Injected
// into expo config by `eas init`. Without it the token call throws
// "No projectId found" and admin push registration silently fails.
const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as any)?.easConfig?.projectId;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('admin_tasks', {
    name: 'Admin Tasks',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: '#FF6B00',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('admin_general', {
    name: 'Admin General',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: '#D4A017',
    sound: 'default',
  });
}

export async function registerAdminPushNotifications() {
  await configureAndroidChannels();

  const currentPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (currentPermissions.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync(
      EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined
    )
  ).data;
  const deviceId =
    Constants.sessionId ||
    Constants.installationId ||
    Constants.expoConfig?.slug ||
    'admin-device';
  const deviceName =
    Constants.deviceName ||
    Constants.expoConfig?.name ||
    'Admin Device';

  await api.post('/admin/notification-devices', {
    pushToken: token,
    platform: Platform.OS,
    deviceId,
    deviceName,
  });

  await AsyncStorage.setItem(ADMIN_PUSH_TOKEN_KEY, token);
  return token;
}

export async function deactivateAdminPushNotifications() {
  const pushToken = await AsyncStorage.getItem(ADMIN_PUSH_TOKEN_KEY);
  if (!pushToken) return;

  try {
    await api.delete(`/admin/notification-devices?pushToken=${encodeURIComponent(pushToken)}`);
  } finally {
    await AsyncStorage.removeItem(ADMIN_PUSH_TOKEN_KEY);
  }
}
