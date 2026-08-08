export type AppTab = 'weather' | 'observe' | 'warning' | 'profile' | 'map';
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

export interface AppData {
  location: { city: string; district: string; updateTime: string };
  weather: { temp: string; status: string; feelsLike: string; humidity: string; windSpeed: string };
  aqi: { value: number; status: string; pm25: number; pm10: number; o3: number; no2: number };
  srdi: SrdiLevel;
  astro: { sunrise: string; sunset: string; moonPhase: string; moonrise: string; moonset: string };
  alerts: { hasActiveAlarm: boolean; title: string; content: string };
}

export interface HourlyForecast {
  time: string;
  temp: string;
  icon: WeatherIconName;
  iconColor: string;
  pop: string;
}

export interface WeeklyForecast {
  day: string;
  icon: WeatherIconName;
  iconColor: string;
  pop: string;
  nightIcon: WeatherIconName;
  nightIconColor: string;
  nightPop: string;
  min: string;
  max: string;
  progressWidth: `${number}%`;
  progressLeft: `${number}%`;
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
