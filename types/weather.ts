export type AppTab = 'weather' | 'observe' | 'warning' | 'profile' | 'map' | 'settings';
export type WeeklyPeriod = 'day' | 'night';
export type SrdiLevel = 'safe' | 'warning' | 'alert' | 'danger';

export interface TaiwanLocation {
  id: string;
  city: string;
  district: string;
}

export type WeatherIconName =
  | 'activity'
  | 'alert-triangle'
  | 'bike'
  | 'cloud'
  | 'cloud-rain'
  | 'cup-soda'
  | 'dog'
  | 'droplets'
  | 'eye'
  | 'heart'
  | 'leaf'
  | 'locate'
  | 'map'
  | 'megaphone'
  | 'menu'
  | 'moon'
  | 'search'
  | 'settings'
  | 'shield'
  | 'shirt'
  | 'soup'
  | 'sprout'
  | 'store'
  | 'sun'
  | 'thermometer'
  | 'user'
  | 'wind'
  | 'x';

export type MakinWeatherIconName =
  | 'clear-day'
  | 'clear-night'
  | 'cloudy'
  | 'cloudy-1-day'
  | 'cloudy-1-night'
  | 'cloudy-2-day'
  | 'cloudy-2-night'
  | 'cloudy-3-day'
  | 'cloudy-3-night'
  | 'dust'
  | 'fog'
  | 'fog-day'
  | 'fog-night'
  | 'frost'
  | 'frost-day'
  | 'frost-night'
  | 'hail'
  | 'haze'
  | 'haze-day'
  | 'haze-night'
  | 'hurricane'
  | 'isolated-thunderstorms'
  | 'isolated-thunderstorms-day'
  | 'isolated-thunderstorms-night'
  | 'rain-and-sleet-mix'
  | 'rain-and-snow-mix'
  | 'rainy-1'
  | 'rainy-1-day'
  | 'rainy-1-night'
  | 'rainy-2'
  | 'rainy-2-day'
  | 'rainy-2-night'
  | 'rainy-3'
  | 'rainy-3-day'
  | 'rainy-3-night'
  | 'scattered-thunderstorms'
  | 'scattered-thunderstorms-day'
  | 'scattered-thunderstorms-night'
  | 'severe-thunderstorm'
  | 'snow-and-sleet-mix'
  | 'snowy-1'
  | 'snowy-1-day'
  | 'snowy-1-night'
  | 'snowy-2'
  | 'snowy-2-day'
  | 'snowy-2-night'
  | 'snowy-3'
  | 'snowy-3-day'
  | 'snowy-3-night'
  | 'thunderstorms'
  | 'tornado'
  | 'tropical-storm'
  | 'wind';

export type AppWeatherIconName = WeatherIconName | MakinWeatherIconName;

export interface AppData {
  location: { city: string; district: string; updateTime: string };
  weather: { temp: string; status: string; feelsLike: string; humidity: string; windSpeed: string };
  aqi: { value: number; status: string; pm25: number; pm10: number; o3: number; no2: number; stationName?: string };
  srdi: SrdiLevel;
  astro: { sunrise: string; sunset: string; moonPhase: string; moonrise: string; moonset: string };
  alerts: { hasActiveAlarm: boolean; title: string; content: string };
}

export interface HourlyForecast {
  time: string;
  temp: string;
  icon: AppWeatherIconName;
  iconColor: string;
  pop: string;
}

export interface WeeklyForecast {
  day: string;
  icon: AppWeatherIconName;
  iconColor: string;
  pop: string;
  nightIcon: AppWeatherIconName;
  nightIconColor: string;
  nightPop: string;
  min: string;
  max: string;
  progressWidth: `${number}%`;
  progressLeft: `${number}%`;
  dayMin?: string;
  dayMax?: string;
  dayProgressWidth?: `${number}%`;
  dayProgressLeft?: `${number}%`;
  nightMin?: string;
  nightMax?: string;
  nightProgressWidth?: `${number}%`;
  nightProgressLeft?: `${number}%`;
}

export interface LifeSuggestion {
  id: string;
  icon: WeatherIconName;
  label: string;
  value: string;
  desc: string;
  iconBg: string;
  iconColor: string;
}

export interface SrdiPresentation {
  iconBg: string;
  badgeBg: string;
  colorText: string;
  status: string;
  desc: string;
  rating: string;
}
