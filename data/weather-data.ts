import type {
  AppData,
  AppTab,
  HourlyForecast,
  LifeSuggestion,
  SrdiLevel,
  SrdiPresentation,
  WeeklyForecast,
} from '@/types/weather';

export const pageTitles: Record<AppTab, string> = {
  weather: '天氣首頁',
  observe: '天氣觀測',
  warning: '災防預警',
  profile: '專欄',
  map: '防災指南',
  settings: '設定',
};

export const srdiLevels: Record<SrdiLevel, SrdiPresentation> = {
  safe: { iconBg: '#F0FDF4', badgeBg: '#DCFCE7', colorText: '#16A34A', status: '路況良好', desc: '風速微弱，適合騎乘', rating: '安全' },
  warning: { iconBg: '#FEFCE8', badgeBg: '#FEF9C3', colorText: '#CA8A04', status: '小心行駛', desc: '陣風稍強，減速慢行', rating: '注意' },
  alert: { iconBg: '#FFF7ED', badgeBg: '#FFEDD5', colorText: '#EA580C', status: '風雨防禦', desc: '穿妥雨衣，過橋防側風', rating: '警戒' },
  danger: { iconBg: '#FEF2F2', badgeBg: '#FEE2E2', colorText: '#DC2626', status: '建議改道', desc: '瞬間強風，避免騎乘', rating: '危險' },
};

export const archivedMotorcycleDefenseCard = {
  title: '機車族防禦指數',
  icon: 'shield',
  levels: srdiLevels,
} as const;

export const initialAppData: AppData = {
  location: { city: '臺中市', district: '北區', updateTime: '11:30' },
  weather: { temp: '22', status: '晴時多雲', feelsLike: '24°', humidity: '68%', windSpeed: '3 m/s' },
  aqi: { value: 35, status: '良好', pm25: 12, pm10: 25, o3: 30, no2: 10, stationName: '臺灣大道站' },
  srdi: 'safe',
  astro: { sunrise: '06:12', sunset: '17:45', moonPhase: '盈凸月', moonrise: '18:30', moonset: '05:20' },
  alerts: {
    hasActiveAlarm: false,
    title: '',
    content: '',
  },
};

export const initialHourlyForecast: HourlyForecast[] = [
  { time: '現在', temp: '22°', icon: 'clear-day', iconColor: '#64748B', pop: '0%' },
  { time: '13:00', temp: '23°', icon: 'clear-day', iconColor: '#64748B', pop: '0%' },
  { time: '14:00', temp: '24°', icon: 'cloudy-2-day', iconColor: '#64748B', pop: '10%' },
  { time: '15:00', temp: '23°', icon: 'cloudy-3-day', iconColor: '#64748B', pop: '20%' },
  { time: '16:00', temp: '21°', icon: 'rainy-1-day', iconColor: '#64748B', pop: '50%' },
  { time: '17:00', temp: '20°', icon: 'rainy-2-day', iconColor: '#64748B', pop: '60%' },
];

export const initialWeeklyForecast: WeeklyForecast[] = [
  { day: '今天', icon: 'clear-day', iconColor: '#64748B', pop: '0%', nightIcon: 'clear-night', nightIconColor: '#64748B', nightPop: '0%', min: '18', max: '26', progressWidth: '60%', progressLeft: '20%' },
  { day: '週一', icon: 'cloudy-2-day', iconColor: '#64748B', pop: '10%', nightIcon: 'cloudy-2-night', nightIconColor: '#64748B', nightPop: '10%', min: '19', max: '24', progressWidth: '50%', progressLeft: '30%' },
  { day: '週二', icon: 'rainy-1-day', iconColor: '#64748B', pop: '40%', nightIcon: 'rainy-1-night', nightIconColor: '#64748B', nightPop: '50%', min: '17', max: '21', progressWidth: '40%', progressLeft: '10%' },
  { day: '週三', icon: 'rainy-2-day', iconColor: '#64748B', pop: '70%', nightIcon: 'rainy-2-night', nightIconColor: '#64748B', nightPop: '60%', min: '16', max: '19', progressWidth: '30%', progressLeft: '5%' },
  { day: '週四', icon: 'cloudy-3-day', iconColor: '#64748B', pop: '20%', nightIcon: 'cloudy-3-night', nightIconColor: '#64748B', nightPop: '20%', min: '17', max: '23', progressWidth: '45%', progressLeft: '15%' },
  { day: '週五', icon: 'clear-day', iconColor: '#64748B', pop: '0%', nightIcon: 'clear-night', nightIconColor: '#64748B', nightPop: '0%', min: '19', max: '27', progressWidth: '65%', progressLeft: '25%' },
  { day: '週六', icon: 'clear-day', iconColor: '#64748B', pop: '0%', nightIcon: 'clear-night', nightIconColor: '#64748B', nightPop: '0%', min: '20', max: '28', progressWidth: '70%', progressLeft: '30%' },
];

export const initialLifeSuggestions: LifeSuggestion[] = [
  { id: 'uv', icon: 'sun', label: '紫外線', value: '中高', desc: '適度防曬', iconBg: '#FEFCE8', iconColor: '#EAB308' },
  { id: 'laundry', icon: 'shirt', label: '曬衣', value: '適合', desc: '天氣穩定', iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  { id: 'outfit', icon: 'user', label: '穿衣', value: '薄長袖', desc: '早晚微涼', iconBg: '#F0FDF4', iconColor: '#22C55E' },
  { id: 'bike', icon: 'bike', label: '騎車', value: '良好', desc: '風速微弱', iconBg: '#F0FDFA', iconColor: '#14B8A6' },
  { id: 'sport', icon: 'activity', label: '運動', value: '適宜', desc: '空氣清新', iconBg: '#FFF7ED', iconColor: '#F97316' },
  { id: 'cold', icon: 'thermometer', label: '感冒', value: '易發', desc: '日夜溫差大', iconBg: '#FAF5FF', iconColor: '#A855F7' },
  { id: 'pet', icon: 'dog', label: '寵物', value: '適宜', desc: '地面溫度佳', iconBg: '#FFF1F2', iconColor: '#F43F5E' },
  { id: 'sprout', icon: 'sprout', label: '長菇', value: '偏高', desc: '注意除濕', iconBg: '#ECFDF5', iconColor: '#10B981' },
  { id: 'drink', icon: 'cup-soda', label: '手搖飲', value: '必喝', desc: '來杯微糖', iconBg: '#FFFBEB', iconColor: '#F59E0B' },
  { id: 'soup', icon: 'soup', label: '進補', value: '不宜', desc: '天氣微熱', iconBg: '#FEF2F2', iconColor: '#EF4444' },
  { id: 'nightmarket', icon: 'store', label: '夜市', value: '極佳', desc: '涼爽宜人', iconBg: '#EEF2FF', iconColor: '#6366F1' },
];
