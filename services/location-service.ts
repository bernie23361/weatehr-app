import * as Location from 'expo-location';
import { findTaiwanLocation } from '@/data/taiwan-locations';
import type { TaiwanLocation } from '@/types/weather';
import type { Coordinates } from '@/services/weather-api';

export type LocationFailure = 'permission-denied' | 'services-disabled' | 'district-not-found' | 'unavailable';

export class LocationServiceError extends Error {
  constructor(public readonly reason: LocationFailure) {
    super(reason);
  }
}

export interface LocatedTaiwanLocation {
  location: TaiwanLocation;
  coordinates: Coordinates;
}

export async function getCurrentTaiwanLocation(): Promise<LocatedTaiwanLocation> {
  if (!(await Location.hasServicesEnabledAsync())) throw new LocationServiceError('services-disabled');

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new LocationServiceError('permission-denied');

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const [address] = await Location.reverseGeocodeAsync(position.coords);
    const location = address ? findTaiwanLocation([
      address.formattedAddress,
      address.region,
      address.subregion,
      address.city,
      address.district,
      address.name,
    ]) : undefined;
    if (!location) throw new LocationServiceError('district-not-found');
    return {
      location,
      coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    };
  } catch (error) {
    if (error instanceof LocationServiceError) throw error;
    throw new LocationServiceError('unavailable');
  }
}
