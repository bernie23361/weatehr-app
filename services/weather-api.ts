import type { AppData, HourlyForecast, LifeSuggestion, SrdiLevel, TaiwanLocation, WeeklyForecast } from '@/types/weather';
import { resolveWeatherConditionIcon } from '@/data/weather-icon-mapping';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CurrentWeatherObservation extends Coordinates {
  observedAt: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  cloudiness: number;
  precipitationIntensity: number;
  visibilityKm: number;
  windSpeedMs: number;
  windDirectionDeg: number;
  weatherCode: number;
  sunrise?: string;
  sunset?: string;
}

export interface ObservationStation {
  stationId: string;
  stationName: string;
  county: string;
  town: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  observedAt: string | null;
  temperature: number | null;
  humidity: number | null;
  windSpeedMs: number | null;
  gustSpeedMs: number | null;
  windDirectionDeg: number | null;
  precipitationIntensity: number | null;
  visibilityKm: number | null;
  weather: string;
}

export interface WeatherApiService {
  getCurrentWeather: (coordinates: Coordinates, location: Pick<TaiwanLocation, 'city' | 'district'>) => Promise<{ data: AppData['weather']; updateTime: string; observation: CurrentWeatherObservation; hourly?: HourlyForecast[] }>;
  geocodeLocation: (location: TaiwanLocation) => Promise<Coordinates>;
  getAQI: (coordinates?: Coordinates) => Promise<Partial<AppData['aqi']> | undefined>;
  getSRDI: (coordinates?: Coordinates) => Promise<{ level: SrdiLevel } | undefined>;
  getHourlyForecast: (coordinates?: Coordinates) => Promise<HourlyForecast[] | undefined>;
  getWeeklyForecast: (coordinates?: Coordinates) => Promise<WeeklyForecast[] | undefined>;
  getAstroData: (coordinates?: Coordinates) => Promise<Partial<AppData['astro']> | undefined>;
  getLifeSuggestions: (coordinates?: Coordinates) => Promise<LifeSuggestion[] | undefined>;
  getAlerts: (coordinates?: Coordinates) => Promise<Partial<AppData['alerts']> | undefined>;
  getObservationStations: (options?: { county?: string }) => Promise<ObservationStation[] | undefined>;
  getFavorites: () => Promise<unknown[] | undefined>;
  addFavorite: (data: unknown) => Promise<unknown>;
  removeFavorite: (id: string) => Promise<void>;
  searchLocation: (keyword: string) => Promise<unknown[] | undefined>;
}

interface CwaCurrentWeatherResponse {
  ok: boolean;
  location: Coordinates & { city: string; district: string };
  current: AppData['weather'] & { mainIcon?: string; precipitationMm?: number };
  observation: {
    observedAt: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeedMs: number;
    windDirectionDeg: number;
    precipitationIntensity: number;
    weatherCode: number;
  };
  hourly?: Array<{
    time: string;
    temp: string;
    pop: string;
    status?: string;
    icon?: string;
  }>;
  error?: { code?: string; message?: string };
}

interface CwaObservationStationsResponse {
  ok: boolean;
  stations?: ObservationStation[];
  error?: { code?: string; message?: string };
}

interface MoenvAirQualityResponse {
  ok: boolean;
  station?: {
    name?: string;
  };
  airQuality?: {
    value: number;
    status: string;
    pm25: number | null;
    pm10: number | null;
    o3: number | null;
    no2: number | null;
  };
  error?: { code?: string; message?: string };
}

const WEATHER_WORKER_BASE_URL = process.env.EXPO_PUBLIC_CWA_WORKER_URL?.replace(/\/weather\/current\/?$/, '')
  ?? 'https://damp-term-b600.weather0215.workers.dev';

const taiwanCityCenters: Record<string, Coordinates> = {
  臺北市: { latitude: 25.0375, longitude: 121.5637 },
  新北市: { latitude: 25.0114, longitude: 121.4618 },
  桃園市: { latitude: 24.9937, longitude: 121.301 },
  臺中市: { latitude: 24.1469, longitude: 120.6839 },
  臺南市: { latitude: 22.9999, longitude: 120.2269 },
  高雄市: { latitude: 22.6273, longitude: 120.3014 },
  基隆市: { latitude: 25.1276, longitude: 121.7392 },
  新竹市: { latitude: 24.8138, longitude: 120.9675 },
  嘉義市: { latitude: 23.4801, longitude: 120.4491 },
  新竹縣: { latitude: 24.839, longitude: 121.0177 },
  苗栗縣: { latitude: 24.5602, longitude: 120.8214 },
  彰化縣: { latitude: 24.0756, longitude: 120.544 },
  南投縣: { latitude: 23.9609, longitude: 120.9719 },
  雲林縣: { latitude: 23.7071, longitude: 120.5409 },
  嘉義縣: { latitude: 23.4591, longitude: 120.3329 },
  屏東縣: { latitude: 22.6761, longitude: 120.4942 },
  宜蘭縣: { latitude: 24.7021, longitude: 121.7378 },
  花蓮縣: { latitude: 23.9911, longitude: 121.6112 },
  臺東縣: { latitude: 22.7554, longitude: 121.15 },
  澎湖縣: { latitude: 23.5712, longitude: 119.5793 },
  金門縣: { latitude: 24.4321, longitude: 118.3171 },
  連江縣: { latitude: 26.1605, longitude: 119.9517 },
};

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather API HTTP ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

function formatUpdateTime(value?: string): string {
  const match = value?.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function resolveHourlyIcon(icon?: string, status?: string): Pick<HourlyForecast, 'icon' | 'iconColor'> {
  const normalizedIcon = icon?.toLowerCase() ?? '';
  const period = normalizedIcon.includes('moon') || normalizedIcon.includes('night') ? 'night' : 'day';
  return { icon: resolveWeatherConditionIcon(status, period), iconColor: '#64748B' };
}

function normalizeHourlyForecast(items?: CwaCurrentWeatherResponse['hourly']): HourlyForecast[] | undefined {
  if (!items?.length) return undefined;

  return items.slice(0, 6).map((item) => ({
    time: item.time,
    temp: item.temp,
    pop: item.pop,
    ...resolveHourlyIcon(item.icon, item.status),
  }));
}

async function getCurrentWeather(coordinates: Coordinates, location: Pick<TaiwanLocation, 'city' | 'district'>): Promise<{ data: AppData['weather']; updateTime: string; observation: CurrentWeatherObservation; hourly?: HourlyForecast[] }> {
  const parameters = new URLSearchParams({
    city: location.city,
    district: location.district,
  });
  const response = await fetchJson<CwaCurrentWeatherResponse>(`${WEATHER_WORKER_BASE_URL}/weather/current?${parameters}`);
  if (!response.ok || !response.current || !response.observation) {
    throw new Error(response.error?.message ?? '中央氣象署即時天氣資料不完整');
  }
  const observation = response.observation;
  return {
    updateTime: formatUpdateTime(observation.observedAt),
    data: response.current,
    hourly: normalizeHourlyForecast(response.hourly),
    observation: {
      latitude: response.location?.latitude ?? coordinates.latitude,
      longitude: response.location?.longitude ?? coordinates.longitude,
      observedAt: observation.observedAt,
      temperature: observation.temperature,
      apparentTemperature: observation.apparentTemperature,
      humidity: observation.humidity,
      cloudiness: 30,
      precipitationIntensity: observation.precipitationIntensity,
      visibilityKm: 18,
      windSpeedMs: observation.windSpeedMs,
      windDirectionDeg: observation.windDirectionDeg,
      weatherCode: observation.weatherCode,
    },
  };
}

async function getObservationStations(options?: { county?: string }): Promise<ObservationStation[] | undefined> {
  const parameters = new URLSearchParams();
  if (options?.county) parameters.set('county', options.county);
  const query = parameters.toString();
  const response = await fetchJson<CwaObservationStationsResponse>(`${WEATHER_WORKER_BASE_URL}/weather/observation${query ? `?${query}` : ''}`);
  if (!response.ok || !response.stations) throw new Error(response.error?.message ?? '中央氣象署測站觀測資料不完整');
  return response.stations;
}

async function getAQI(coordinates?: Coordinates): Promise<Partial<AppData['aqi']> | undefined> {
  if (!coordinates) return undefined;
  const parameters = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  });
  const response = await fetchJson<MoenvAirQualityResponse>(`${WEATHER_WORKER_BASE_URL}/air-quality?${parameters}`);
  const airQuality = response.airQuality;
  if (!response.ok || !airQuality) throw new Error(response.error?.message ?? '環境部空氣品質資料不完整');
  return {
    value: airQuality.value,
    status: airQuality.status,
    ...(response.station?.name ? { stationName: response.station.name } : {}),
    ...(airQuality.pm25 == null ? {} : { pm25: airQuality.pm25 }),
    ...(airQuality.pm10 == null ? {} : { pm10: airQuality.pm10 }),
    ...(airQuality.o3 == null ? {} : { o3: airQuality.o3 }),
    ...(airQuality.no2 == null ? {} : { no2: airQuality.no2 }),
  };
}

async function geocodeLocation(location: TaiwanLocation): Promise<Coordinates> {
  const coordinates = taiwanCityCenters[location.city];
  if (coordinates) return coordinates;
  throw new Error(`Unable to geocode ${location.city}${location.district}`);
}

export const weatherApi: WeatherApiService = {
  getCurrentWeather,
  geocodeLocation,
  getAQI,
  getSRDI: async () => undefined,
  getHourlyForecast: async () => undefined,
  getWeeklyForecast: async () => undefined,
  getAstroData: async () => undefined,
  getLifeSuggestions: async () => undefined,
  getAlerts: async () => undefined,
  getObservationStations: async () => undefined,
  getFavorites: async () => undefined,
  addFavorite: async () => undefined,
  removeFavorite: async () => undefined,
  searchLocation: async () => undefined,
};
