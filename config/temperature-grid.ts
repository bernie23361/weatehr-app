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
export const TEMPERATURE_ABOVE_MAX_COLOR = '#8E3E9F';

export interface TemperatureColorStop {
  temperature: number;
  color: string;
}

export const TEMPERATURE_COLOR_STOPS: TemperatureColorStop[] = [
  { temperature: TEMPERATURE_MIN, color: '#0369A1' },
  { temperature: 10, color: '#0369A1' },
  { temperature: 11, color: '#166534' },
  { temperature: 15, color: '#166534' },
  { temperature: 16, color: '#15803D' },
  { temperature: 19, color: '#15803D' },
  { temperature: 20, color: '#4D7C0F' },
  { temperature: 23, color: '#4D7C0F' },
  { temperature: 24, color: '#A16207' },
  { temperature: 26, color: '#A16207' },
  { temperature: 27, color: '#B45309' },
  { temperature: 30, color: '#B45309' },
  { temperature: 31, color: '#C2410C' },
  { temperature: 34, color: '#C2410C' },
  { temperature: 35, color: '#D7194A' },
  { temperature: TEMPERATURE_MAX, color: '#D7194A' },
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

const pad = (value: number) => value.toFixed(6);

export function temperatureGridImageUrl(): string {
  const workerUrl = (process.env.EXPO_PUBLIC_TEMPERATURE_WORKER_URL || DEFAULT_TEMPERATURE_WORKER_URL).replace(/\/$/, '');
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

  return `${workerUrl}/api/temperature/map.png?scale=${TEMPERATURE_IMAGE_SCALE}&min=${TEMPERATURE_MIN}&max=${TEMPERATURE_MAX}&palette=${encodeURIComponent(palette)}&bounds=${encodeURIComponent(bounds)}`;
}
