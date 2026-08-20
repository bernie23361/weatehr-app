import { Platform } from 'react-native';

export type WeatherRefreshIntervalMinutes = 15 | 30 | 60;
export type AppearanceMode = 'light' | 'dark';

export interface AppSettings {
  autoRefreshWeather: boolean;
  refreshIntervalMinutes: WeatherRefreshIntervalMinutes;
  reduceMotion: boolean;
  appearanceMode: AppearanceMode;
}

export const defaultAppSettings: AppSettings = {
  autoRefreshWeather: true,
  refreshIntervalMinutes: 30,
  reduceMotion: false,
  appearanceMode: 'light',
};

const SETTINGS_KEY = 'weather-app.settings.v1';

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const stored = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(SETTINGS_KEY)
      : await (await import('expo-secure-store')).getItemAsync(SETTINGS_KEY);
    if (!stored) return defaultAppSettings;
    const parsed = JSON.parse(stored) as Partial<AppSettings>;
    const interval = parsed.refreshIntervalMinutes;
    return {
      autoRefreshWeather: parsed.autoRefreshWeather ?? defaultAppSettings.autoRefreshWeather,
      refreshIntervalMinutes: interval === 15 || interval === 30 || interval === 60
        ? interval
        : defaultAppSettings.refreshIntervalMinutes,
      reduceMotion: parsed.reduceMotion ?? defaultAppSettings.reduceMotion,
      appearanceMode: parsed.appearanceMode === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return defaultAppSettings;
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const serialized = JSON.stringify(settings);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(SETTINGS_KEY, serialized);
    return;
  }
  await (await import('expo-secure-store')).setItemAsync(SETTINGS_KEY, serialized);
}
