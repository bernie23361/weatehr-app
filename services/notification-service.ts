import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationCategoryType = 'general' | 'alert';

export interface NotificationPayload {
  type: NotificationCategoryType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const GENERAL_CHANNEL_ID = 'weather-general';
export const ALERT_CHANNEL_ID = 'weather-alert';
export const GENERAL_CATEGORY_ID = 'weather-general';
export const ALERT_CATEGORY_ID = 'weather-alert';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(GENERAL_CHANNEL_ID, {
      name: '一般通知',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
      name: '預警通知',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#FF231F7C',
    });
  }

  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync(GENERAL_CATEGORY_ID, []);
    await Notifications.setNotificationCategoryAsync(ALERT_CATEGORY_ID, []);
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || (Platform.OS === 'ios' && existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted || (Platform.OS === 'ios' && requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);
}

export async function presentLocalNotification(payload: NotificationPayload): Promise<string | null> {
  const granted = await ensureNotificationPermissions();
  if (!granted) return null;
  const content: Notifications.NotificationContentInput = {
    title: payload.title,
    body: payload.body,
    sound: 'default',
    data: { type: payload.type, ...payload.data },
  };
  if (Platform.OS === 'ios') {
    content.categoryIdentifier = payload.type === 'alert' ? ALERT_CATEGORY_ID : GENERAL_CATEGORY_ID;
  }
  const trigger: Notifications.NotificationTriggerInput = Platform.OS === 'android'
    ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: payload.type === 'alert' ? ALERT_CHANNEL_ID : GENERAL_CHANNEL_ID, repeats: false }
    : null;
  return Notifications.scheduleNotificationAsync({ content, trigger });
}

export async function scheduleLocalNotification(payload: NotificationPayload, seconds: number): Promise<string | null> {
  const granted = await ensureNotificationPermissions();
  if (!granted) return null;
  const content: Notifications.NotificationContentInput = {
    title: payload.title,
    body: payload.body,
    sound: 'default',
    data: { type: payload.type, ...payload.data },
  };
  if (Platform.OS === 'ios') {
    content.categoryIdentifier = payload.type === 'alert' ? ALERT_CATEGORY_ID : GENERAL_CATEGORY_ID;
  }
  const trigger: Notifications.NotificationTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    ...(Platform.OS === 'android' ? { channelId: payload.type === 'alert' ? ALERT_CHANNEL_ID : GENERAL_CHANNEL_ID, repeats: false } : {}),
  };
  return Notifications.scheduleNotificationAsync({ content, trigger });
}

export function notificationTypeFromData(data: Record<string, unknown> | undefined): NotificationCategoryType | undefined {
  return data?.type === 'alert' ? 'alert' : data?.type === 'general' ? 'general' : undefined;
}
