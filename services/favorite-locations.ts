import { Platform } from 'react-native';
import type { TaiwanLocation } from '@/types/weather';

const FAVORITE_LOCATIONS_KEY = 'weather-app.favorite-locations.v1';

function isTaiwanLocation(value: unknown): value is TaiwanLocation {
  if (!value || typeof value !== 'object') return false;
  const location = value as Partial<TaiwanLocation>;
  return typeof location.id === 'string'
    && typeof location.city === 'string'
    && typeof location.district === 'string';
}

function normalizeFavoriteLocations(value: unknown): TaiwanLocation[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.reduce<TaiwanLocation[]>((locations, item) => {
    if (!isTaiwanLocation(item) || seen.has(item.id)) return locations;
    seen.add(item.id);
    locations.push({ id: item.id, city: item.city, district: item.district });
    return locations;
  }, []);
}

export async function loadFavoriteLocations(): Promise<TaiwanLocation[]> {
  try {
    const stored = Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(FAVORITE_LOCATIONS_KEY)
      : await (await import('expo-secure-store')).getItemAsync(FAVORITE_LOCATIONS_KEY);
    if (!stored) return [];
    return normalizeFavoriteLocations(JSON.parse(stored));
  } catch {
    return [];
  }
}

export async function saveFavoriteLocations(locations: TaiwanLocation[]): Promise<void> {
  const serialized = JSON.stringify(normalizeFavoriteLocations(locations));
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(FAVORITE_LOCATIONS_KEY, serialized);
    return;
  }
  await (await import('expo-secure-store')).setItemAsync(FAVORITE_LOCATIONS_KEY, serialized);
}
