import type { MakinWeatherIconName } from '@/types/weather';

export const WEATHER_ICON_COLORS = {
  deepBlue: '#0057D9',
  rainBlue: '#2096FF',
  cloudBlue: '#6DC7FF',
  cloudLight: '#B7E3FF',
  sunYellow: '#F2C94C',
  statusGreen: '#22C55E',
  stormGray: '#64748B',
} as const;

export const makinWeatherIconSources = {
  'clear-day': require('../assets/weather-icons/static/clear-day.svg'),
  'clear-night': require('../assets/weather-icons/static/clear-night.svg'),
  cloudy: require('../assets/weather-icons/static/cloudy.svg'),
  'cloudy-1-day': require('../assets/weather-icons/static/cloudy-1-day.svg'),
  'cloudy-1-night': require('../assets/weather-icons/static/cloudy-1-night.svg'),
  'cloudy-2-day': require('../assets/weather-icons/static/cloudy-2-day.svg'),
  'cloudy-2-night': require('../assets/weather-icons/static/cloudy-2-night.svg'),
  'cloudy-3-day': require('../assets/weather-icons/static/cloudy-3-day.svg'),
  'cloudy-3-night': require('../assets/weather-icons/static/cloudy-3-night.svg'),
  dust: require('../assets/weather-icons/static/dust.svg'),
  fog: require('../assets/weather-icons/static/fog.svg'),
  'fog-day': require('../assets/weather-icons/static/fog-day.svg'),
  'fog-night': require('../assets/weather-icons/static/fog-night.svg'),
  frost: require('../assets/weather-icons/static/frost.svg'),
  'frost-day': require('../assets/weather-icons/static/frost-day.svg'),
  'frost-night': require('../assets/weather-icons/static/frost-night.svg'),
  hail: require('../assets/weather-icons/static/hail.svg'),
  haze: require('../assets/weather-icons/static/haze.svg'),
  'haze-day': require('../assets/weather-icons/static/haze-day.svg'),
  'haze-night': require('../assets/weather-icons/static/haze-night.svg'),
  hurricane: require('../assets/weather-icons/static/hurricane.svg'),
  'isolated-thunderstorms': require('../assets/weather-icons/static/isolated-thunderstorms.svg'),
  'isolated-thunderstorms-day': require('../assets/weather-icons/static/isolated-thunderstorms-day.svg'),
  'isolated-thunderstorms-night': require('../assets/weather-icons/static/isolated-thunderstorms-night.svg'),
  'rain-and-sleet-mix': require('../assets/weather-icons/static/rain-and-sleet-mix.svg'),
  'rain-and-snow-mix': require('../assets/weather-icons/static/rain-and-snow-mix.svg'),
  'rainy-1': require('../assets/weather-icons/static/rainy-1.svg'),
  'rainy-1-day': require('../assets/weather-icons/static/rainy-1-day.svg'),
  'rainy-1-night': require('../assets/weather-icons/static/rainy-1-night.svg'),
  'rainy-2': require('../assets/weather-icons/static/rainy-2.svg'),
  'rainy-2-day': require('../assets/weather-icons/static/rainy-2-day.svg'),
  'rainy-2-night': require('../assets/weather-icons/static/rainy-2-night.svg'),
  'rainy-3': require('../assets/weather-icons/static/rainy-3.svg'),
  'rainy-3-day': require('../assets/weather-icons/static/rainy-3-day.svg'),
  'rainy-3-night': require('../assets/weather-icons/static/rainy-3-night.svg'),
  'scattered-thunderstorms': require('../assets/weather-icons/static/scattered-thunderstorms.svg'),
  'scattered-thunderstorms-day': require('../assets/weather-icons/static/scattered-thunderstorms-day.svg'),
  'scattered-thunderstorms-night': require('../assets/weather-icons/static/scattered-thunderstorms-night.svg'),
  'severe-thunderstorm': require('../assets/weather-icons/static/severe-thunderstorm.svg'),
  'snow-and-sleet-mix': require('../assets/weather-icons/static/snow-and-sleet-mix.svg'),
  'snowy-1': require('../assets/weather-icons/static/snowy-1.svg'),
  'snowy-1-day': require('../assets/weather-icons/static/snowy-1-day.svg'),
  'snowy-1-night': require('../assets/weather-icons/static/snowy-1-night.svg'),
  'snowy-2': require('../assets/weather-icons/static/snowy-2.svg'),
  'snowy-2-day': require('../assets/weather-icons/static/snowy-2-day.svg'),
  'snowy-2-night': require('../assets/weather-icons/static/snowy-2-night.svg'),
  'snowy-3': require('../assets/weather-icons/static/snowy-3.svg'),
  'snowy-3-day': require('../assets/weather-icons/static/snowy-3-day.svg'),
  'snowy-3-night': require('../assets/weather-icons/static/snowy-3-night.svg'),
  thunderstorms: require('../assets/weather-icons/static/thunderstorms.svg'),
  tornado: require('../assets/weather-icons/static/tornado.svg'),
  'tropical-storm': require('../assets/weather-icons/static/tropical-storm.svg'),
  wind: require('../assets/weather-icons/static/wind.svg'),
} satisfies Record<MakinWeatherIconName, unknown>;

export type WeatherIconPeriod = 'day' | 'night';

const withPeriod = (
  period: WeatherIconPeriod,
  dayIcon: MakinWeatherIconName,
  nightIcon: MakinWeatherIconName,
) => (period === 'night' ? nightIcon : dayIcon);

export function resolveWeatherConditionIcon(condition?: string, period: WeatherIconPeriod = 'day'): MakinWeatherIconName {
  const value = condition?.trim() ?? '';

  if (value.includes('強風')) return 'wind';
  if (value.includes('霾')) return withPeriod(period, 'haze-day', 'haze-night');
  if (value.includes('霧')) return withPeriod(period, 'fog-day', 'fog-night');
  if (value.includes('冰雹') || value.includes('雹')) return 'hail';
  if (value.includes('霜')) return withPeriod(period, 'frost-day', 'frost-night');
  if (value.includes('雨雪') || (value.includes('雨') && value.includes('雪'))) return 'rain-and-snow-mix';
  if (value.includes('雪')) return withPeriod(period, 'snowy-2-day', 'snowy-2-night');
  if (value.includes('颱風')) return 'tropical-storm';
  if (value.includes('龍捲風')) return 'tornado';

  if (value.includes('強雷雨') || value.includes('劇烈雷雨')) return 'severe-thunderstorm';
  if (value.includes('雷')) {
    if (value.includes('局部') || value.includes('午後')) {
      return withPeriod(period, 'isolated-thunderstorms-day', 'isolated-thunderstorms-night');
    }
    if (value.includes('多雲') || value.includes('陰')) {
      return withPeriod(period, 'scattered-thunderstorms-day', 'scattered-thunderstorms-night');
    }
    return 'thunderstorms';
  }

  if (value.includes('較明顯降雨') || value.includes('大雨') || value.includes('豪雨')) return withPeriod(period, 'rainy-3-day', 'rainy-3-night');
  if (value.includes('陣雨') || value === '雨') return withPeriod(period, 'rainy-2-day', 'rainy-2-night');
  if (value.includes('小雨') || value.includes('短暫雨') || value.includes('雨')) return withPeriod(period, 'rainy-1-day', 'rainy-1-night');

  if (value === '晴') return withPeriod(period, 'clear-day', 'clear-night');
  if (value === '晴時多雲') return withPeriod(period, 'cloudy-1-day', 'cloudy-1-night');
  if (value === '多雲時晴') return withPeriod(period, 'cloudy-2-day', 'cloudy-2-night');
  if (value === '多雲') return 'cloudy';
  if (value === '多雲時陰' || value === '陰時多雲') return 'cloudy';
  if (value === '陰') return 'cloudy';

  if (value.includes('晴')) return withPeriod(period, 'cloudy-1-day', 'cloudy-1-night');
  if (value.includes('多雲')) return 'cloudy';
  if (value.includes('陰')) return 'cloudy';

  return withPeriod(period, 'cloudy-1-day', 'cloudy-1-night');
}
