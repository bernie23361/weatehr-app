import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';

export type NotificationCategoryType = 'general' | 'alert';

export const GENERAL_CHANNEL_ID = 'weather-general';
export const ALERT_CHANNEL_ID = 'weather-alert';
export const GENERAL_CATEGORY_ID = 'weather-general';
export const ALERT_CATEGORY_ID = 'weather-alert';

async function getNativeNotifications() {
  if (Platform.OS === 'web') return undefined;
  return import('expo-notifications');
}

export async function configureNotificationHandler(): Promise<void> {
  const Notifications = await getNativeNotifications();
  if (!Notifications) return;
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
  if (Platform.OS === 'web') return false;
  const Notifications = await getNativeNotifications();
  if (!Notifications) return false;
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

export function subscribeToAlertResponses(onAlert: (alert: { title: string; content: string }) => void): () => void {
  if (Platform.OS === 'web') return () => undefined;

  let disposed = false;
  let subscription: ExpoNotifications.Subscription | undefined;
  const openAlertFromResponse = (response: ExpoNotifications.NotificationResponse) => {
    const { data, title, body } = response.notification.request.content;
    if (notificationTypeFromData(data as Record<string, unknown>) === 'alert' && title && body) {
      onAlert({ title, content: body });
    }
  };

  void getNativeNotifications().then((Notifications) => {
    if (!Notifications || disposed) return;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && !disposed) openAlertFromResponse(response);
    });
    subscription = Notifications.addNotificationResponseReceivedListener(openAlertFromResponse);
  });

  return () => {
    disposed = true;
    subscription?.remove();
  };
}

export function notificationTypeFromData(data: Record<string, unknown> | undefined): NotificationCategoryType | undefined {
  return data?.type === 'alert' ? 'alert' : data?.type === 'general' ? 'general' : undefined;
}
