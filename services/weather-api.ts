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
  getCurrentWeather: (coordinates: Coordinates, location: Pick<TaiwanLocation, 'city' | 'district'>) => Promise<{ data: AppData['weather']; updateTime: string; observedTime?: string; observation: CurrentWeatherObservation; hourly?: HourlyForecast[] }>;
  geocodeLocation: (location: TaiwanLocation) => Promise<Coordinates>;
  getAQI: (coordinates?: Coordinates) => Promise<Partial<AppData['aqi']> | undefined>;
  getSRDI: (coordinates?: Coordinates) => Promise<{ level: SrdiLevel } | undefined>;
  getHourlyForecast: (coordinates?: Coordinates) => Promise<HourlyForecast[] | undefined>;
  getWeeklyForecast: (location: Pick<TaiwanLocation, 'city' | 'district'>) => Promise<WeeklyForecast[] | undefined>;
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
  // Worker 產生此 bundle 的時間（台灣時間，例如 2026-10-19T04:35:00+08:00），
  // 代表資料更新時間，與 observation.observedAt（測站觀測時間）不同。
  metadata?: { source?: string; updatedAt?: string; cacheTtlSeconds?: number; warnings?: string[] };
  error?: { code?: string; message?: string };
}

interface CwaObservationStationsResponse {
  ok: boolean;
  stations?: ObservationStation[];
  error?: { code?: string; message?: string };
}

interface CwaWeeklyForecastResponse {
  ok: boolean;
  weekly?: Array<{
    date: string;
    day?: { status: string; weatherCode: number; pop: number | null; min?: number; max?: number };
    night?: { status: string; weatherCode: number; pop: number | null; min?: number; max?: number };
    min: number;
    max: number;
  }>;
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
  // 該空品測站的資料發布（觀測）時間；Worker 以 record.publishtime 回傳。
  observedAt?: string | null;
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

async function fetchJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather API HTTP ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

// 將後端時間統一換算為台灣時間（Asia/Taipei）的「HH:MM」。
// - 帶時區標記的字串（例如 2026-10-19T04:35:00+08:00 或 ...Z）以實際時刻換算，
//   顯示結果不受裝置時區影響。
// - 不含時區的在地牆鐘字串（例如環境部的 2026-10-19 04:00）本身即為台灣時間，直接取時分。
// 缺值或無法解析時回傳 undefined，絕不以裝置目前時間或固定值冒充資料時間。
function formatTaipeiClockTime(value?: string | null): string | undefined {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const timestamp = Date.parse(text.includes('T') ? text : text.replace(' ', 'T'));
    if (!Number.isFinite(timestamp)) return undefined;
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(timestamp);
  }
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const;

function weeklyDayLabel(date: string, index: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const parsed = new Date(`${date}T00:00:00+08:00`);
  const weekday = date === today ? '今天' : Number.isNaN(parsed.getTime()) ? `第 ${index + 1} 天` : WEEKDAY_LABELS[parsed.getDay()];
  const dayOfMonth = Number.parseInt(date.slice(8, 10), 10);
  return Number.isFinite(dayOfMonth) ? `${weekday}（${dayOfMonth}）` : weekday;
}

function normalizeWeeklyForecast(items?: CwaWeeklyForecastResponse['weekly']): WeeklyForecast[] | undefined {
  if (!items?.length) return undefined;
  const temperatures = items.flatMap((item) => [item.min, item.max, item.day?.min, item.day?.max, item.night?.min, item.night?.max]).filter((value): value is number => value !== undefined && Number.isFinite(value));
  const minimum = Math.min(...temperatures);
  const maximum = Math.max(...temperatures);
  const range = Math.max(maximum - minimum, 1);
  const progressFor = (min: number, max: number) => {
    const left = Math.round(((min - minimum) / range) * 35);
    const width = Math.max(12, Math.round(((max - min) / range) * 65));
    return { left: `${left}%` as const, width: `${Math.min(width, 100 - left)}%` as const };
  };
  const probabilityLabel = (value: number | null) => value == null ? '—' : `${value}%`;

  return items.slice(0, 7).map((item, index) => {
    const fallback = { status: '多雲', weatherCode: 4, pop: null, min: item.min, max: item.max };
    const day = item.day ?? item.night ?? fallback;
    const night = item.night ?? item.day ?? day;
    const dailyProgress = progressFor(item.min, item.max);
    const dayMin = day.min ?? item.min;
    const dayMax = day.max ?? item.max;
    const nightMin = night.min ?? item.min;
    const nightMax = night.max ?? item.max;
    const dayProgress = progressFor(dayMin, dayMax);
    const nightProgress = progressFor(nightMin, nightMax);
    return {
      day: weeklyDayLabel(item.date, index),
      icon: resolveWeatherConditionIcon(day.status, 'day'),
      iconColor: '#64748B',
      pop: probabilityLabel(day.pop),
      nightIcon: resolveWeatherConditionIcon(night.status, 'night'),
      nightIconColor: '#64748B',
      nightPop: probabilityLabel(night.pop),
      min: String(Math.round(item.min)),
      max: String(Math.round(item.max)),
      progressLeft: dailyProgress.left,
      progressWidth: dailyProgress.width,
      dayMin: String(Math.round(dayMin)),
      dayMax: String(Math.round(dayMax)),
      dayProgressLeft: dayProgress.left,
      dayProgressWidth: dayProgress.width,
      nightMin: String(Math.round(nightMin)),
      nightMax: String(Math.round(nightMax)),
      nightProgressLeft: nightProgress.left,
      nightProgressWidth: nightProgress.width,
    };
  });
}

async function getCurrentWeather(coordinates: Coordinates, location: Pick<TaiwanLocation, 'city' | 'district'>): Promise<{ data: AppData['weather']; updateTime: string; observedTime?: string; observation: CurrentWeatherObservation; hourly?: HourlyForecast[] }> {
  const parameters = new URLSearchParams({
    city: location.city,
    district: location.district,
  });
  const response = await fetchJson<CwaCurrentWeatherResponse>(`${WEATHER_WORKER_BASE_URL}/weather/current?${parameters}`);
  if (!response.ok || !response.current || !response.observation) {
    throw new Error(response.error?.message ?? '中央氣象署即時天氣資料不完整');
  }
  const observation = response.observation;
  // 更新時間取自 Worker 回報的 metadata.updatedAt（bundle 產生時間）；
  // 觀測時間才是測站 observedAt。兩者刻意分開，避免把觀測時間當成更新時間。
  const updateTime = formatTaipeiClockTime(response.metadata?.updatedAt);
  const observedTime = formatTaipeiClockTime(observation.observedAt);
  return {
    updateTime: updateTime ?? '',
    ...(observedTime ? { observedTime } : {}),
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
  const url = `${WEATHER_WORKER_BASE_URL}/weather/observation${query ? `?${query}` : ''}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchJson<CwaObservationStationsResponse>(url, 25_000);
      if (!response.ok || !response.stations?.length) {
        throw new Error(response.error?.message ?? '中央氣象署測站觀測資料不完整');
      }
      return response.stations;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('中央氣象署測站觀測資料載入失敗');
}

async function getWeeklyForecast(location: Pick<TaiwanLocation, 'city' | 'district'>): Promise<WeeklyForecast[] | undefined> {
  const parameters = new URLSearchParams({ city: location.city, district: location.district });
  const response = await fetchJson<CwaWeeklyForecastResponse>(`${WEATHER_WORKER_BASE_URL}/weather/weekly?${parameters}`);
  if (!response.ok || !response.weekly) throw new Error(response.error?.message ?? '中央氣象署一週預報資料不完整');
  return normalizeWeeklyForecast(response.weekly);
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
  const observedTime = formatTaipeiClockTime(response.observedAt);
  return {
    value: airQuality.value,
    status: airQuality.status,
    ...(response.station?.name ? { stationName: response.station.name } : {}),
    ...(observedTime ? { observedTime } : {}),
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
  getWeeklyForecast,
  getAstroData: async () => undefined,
  getLifeSuggestions: async () => undefined,
  getAlerts: async () => undefined,
  getObservationStations,
  getFavorites: async () => undefined,
  addFavorite: async () => undefined,
  removeFavorite: async () => undefined,
  searchLocation: async () => undefined,
};
