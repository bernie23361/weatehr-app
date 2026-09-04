export interface TemperatureBounds {
  topLeft: [number, number];
  topRight: [number, number];
  bottomRight: [number, number];
  bottomLeft: [number, number];
}

export const TEMPERATURE_BOUNDS: TemperatureBounds = {
  topLeft: [120.008249, 25.448276],
  topRight: [121.988227, 25.448165],
  bottomRight: [121.988008, 21.878159],
  bottomLeft: [120.008026, 21.878255],
};

export const TEMPERATURE_MIN = -5;
export const TEMPERATURE_MAX = 39;
export const TEMPERATURE_ABOVE_MAX_COLOR = '#782B95';

export interface TemperatureColorStop {
  temperature: number;
  color: string;
}

export const TEMPERATURE_COLOR_STOPS: TemperatureColorStop[] = [
  // 依中央氣象署即時溫度分布圖圖例取色（2026-08-20）。
  { temperature: TEMPERATURE_MIN, color: '#107388' },
  { temperature: -1, color: '#107388' },
  { temperature: 1, color: '#227E93' },
  { temperature: 3, color: '#3D94A8' },
  { temperature: 5, color: '#63B0C2' },
  { temperature: 7, color: '#87CCD9' },
  { temperature: 9, color: '#A5E1EC' },
  { temperature: 10, color: '#B3EBF8' },
  { temperature: 11, color: '#0D894D' },
  { temperature: 13, color: '#2FA257' },
  { temperature: 15, color: '#51B265' },
  { temperature: 17, color: '#74C16F' },
  { temperature: 19, color: '#95D07E' },
  { temperature: 21, color: '#BBDF88' },
  { temperature: 23, color: '#D9F191' },
  { temperature: 25, color: '#F6E78C' },
  { temperature: 27, color: '#F3C361' },
  { temperature: 29, color: '#EB9D39' },
  { temperature: 31, color: '#E07B07' },
  { temperature: 33, color: '#EA175A' },
  { temperature: 35, color: '#75030B' },
  { temperature: 36, color: '#9A68B1' },
  { temperature: 37, color: '#8D4FA4' },
  { temperature: 38, color: '#782B95' },
  { temperature: TEMPERATURE_MAX, color: '#782B95' },
];

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const padHex = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0').toUpperCase();

export const mixTemperatureColor = (colorA: string, colorB: string, progress: number): string => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  return `#${[
    padHex(a[0] + (b[0] - a[0]) * progress),
    padHex(a[1] + (b[1] - a[1]) * progress),
    padHex(a[2] + (b[2] - a[2]) * progress),
  ].join('')}`;
};

export function temperatureColor(value: number): string {
  if (value > TEMPERATURE_MAX) return TEMPERATURE_ABOVE_MAX_COLOR;
  if (value <= TEMPERATURE_MIN) return TEMPERATURE_COLOR_STOPS[0].color;

  for (let index = 0; index < TEMPERATURE_COLOR_STOPS.length - 1; index += 1) {
    const start = TEMPERATURE_COLOR_STOPS[index];
    const end = TEMPERATURE_COLOR_STOPS[index + 1];
    if (value <= end.temperature) {
      const progress = (value - start.temperature) / (end.temperature - start.temperature || 1);
      return mixTemperatureColor(start.color, end.color, Math.min(1, Math.max(0, progress)));
    }
  }

  return TEMPERATURE_COLOR_STOPS[TEMPERATURE_COLOR_STOPS.length - 1].color;
}

export const TEMPERATURE_COLOR_BY_DEGREE: Record<number, string> = Object.fromEntries(
  Array.from({ length: TEMPERATURE_MAX - TEMPERATURE_MIN + 1 }, (_, index) => {
    const temperature = TEMPERATURE_MIN + index;
    return [temperature, temperatureColor(temperature)];
  }),
);

const DEFAULT_TEMPERATURE_WORKER_URL = 'https://weather-temperature-worker.weather0215.workers.dev';
const TEMPERATURE_IMAGE_SCALE = 4;

export const TEMPERATURE_GRID_REQUESTS_ENABLED = process.env.EXPO_PUBLIC_TEMPERATURE_GRID_ENABLED !== 'false';

const pad = (value: number) => value.toFixed(6);

const temperatureWorkerUrl = (): string => (
  process.env.EXPO_PUBLIC_TEMPERATURE_WORKER_URL || DEFAULT_TEMPERATURE_WORKER_URL
).replace(/\/$/, '');

export function temperatureGridMetadataUrl(): string {
  return `${temperatureWorkerUrl()}/api/temperature`;
}

export function temperatureGridImageUrl(): string {
  const workerUrl = temperatureWorkerUrl();
  const palette = Array.from({ length: TEMPERATURE_MAX - TEMPERATURE_MIN + 1 }, (_, index) => {
    const temperature = TEMPERATURE_MIN + index;
    return `${temperature}:${TEMPERATURE_COLOR_BY_DEGREE[temperature]}`;
  }).join(',');
  const bounds = [
    TEMPERATURE_BOUNDS.topLeft,
    TEMPERATURE_BOUNDS.topRight,
    TEMPERATURE_BOUNDS.bottomRight,
    TEMPERATURE_BOUNDS.bottomLeft,
  ].map(([longitude, latitude]) => `${pad(longitude)},${pad(latitude)}`).join(';');

  const query = [
    `scale=${TEMPERATURE_IMAGE_SCALE}`,
    `min=${TEMPERATURE_MIN}`,
    `max=${TEMPERATURE_MAX}`,
    `palette=${encodeURIComponent(palette)}`,
    `bounds=${encodeURIComponent(bounds)}`,
  ];
  return `${workerUrl}/api/temperature/map.png?${query.join('&')}`;
}
