import { resolveFeelsLikeStatus, resolveHumidityStatus, resolveWindStatus } from '@/data/weather-stat-status';
import type { AppData } from '@/types/weather';

export type WeatherStat = 'feelsLike' | 'humidity' | 'windSpeed';

export function getWeatherStatDetails(metric: WeatherStat, data: AppData) {
  const weather = data.weather;
  const definitions = {
    feelsLike: {
      title: '體感溫度', unit: '攝氏 °C', resolve: resolveFeelsLikeStatus,
      phrase: '體感溫度綜合氣溫、濕度與風速，呈現人體對冷暖的感受。',
      measurements: [['實際氣溫', `${weather.temp}°`, ''], ['相對濕度', weather.humidity, ''], ['平均風速', weather.windSpeed, ''], ['與氣溫差異', temperatureDifference(weather.feelsLike, weather.temp), '']],
    },
    humidity: {
      title: '相對濕度', unit: '百分比 %', resolve: resolveHumidityStatus,
      phrase: '相對濕度表示空氣中的水氣相對於同溫度下飽和水氣的比例，數值越高表示越接近飽和。',
      measurements: [['實際氣溫', `${weather.temp}°`, ''], ['體感溫度', weather.feelsLike, ''], ['平均風速', weather.windSpeed, ''], ['指標範圍', '0–100', '%']],
    },
    windSpeed: {
      title: '平均風速', unit: '風速 m/s', resolve: resolveWindStatus,
      phrase: '平均風速表示一段觀測時間內的平均風力大小；瞬間陣風可能更強。',
      measurements: [['換算時速', windKilometersPerHour(weather.windSpeed), 'km/h'], ['實際氣溫', `${weather.temp}°`, ''], ['體感溫度', weather.feelsLike, ''], ['相對濕度', weather.humidity, '']],
    },
  };
  const definition = definitions[metric];
  const value = weather[metric];
  const valid = Number.isFinite(Number.parseFloat(value));
  const status = valid ? definition.resolve(value) : { label: '暫無資料', badgeText: '#64748B' };
  return { ...definition, value: valid ? value.replace(/\s*(?:°C?|%|m\/s)\s*$/i, '') : '—', status };
}

function temperatureDifference(feelsLike: string, temperature: string) {
  const difference = Number.parseFloat(feelsLike) - Number.parseFloat(temperature);
  return Number.isFinite(difference) ? `${difference > 0 ? '+' : ''}${Number(difference.toFixed(1))}°` : '—';
}

function windKilometersPerHour(speed: string) {
  const value = Number.parseFloat(speed);
  return Number.isFinite(value) ? (value * 3.6).toFixed(1) : '—';
}
