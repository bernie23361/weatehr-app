export interface WeatherStatStatus {
  label: string;
  badgeBg: string;
  badgeText: string;
}

const numericValue = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function resolveFeelsLikeStatus(value: string): WeatherStatStatus {
  const temperature = numericValue(value);
  if (temperature < 5) return { label: '酷寒', badgeBg: '#E0F2FE', badgeText: '#0369A1' };
  if (temperature <= 10) return { label: '嚴寒', badgeBg: '#E0F2FE', badgeText: '#0369A1' };
  if (temperature <= 15) return { label: '寒冷', badgeBg: '#DCFCE7', badgeText: '#166534' };
  if (temperature <= 19) return { label: '偏冷', badgeBg: '#F0FDF4', badgeText: '#15803D' };
  if (temperature <= 23) return { label: '涼爽', badgeBg: '#ECFDF5', badgeText: '#4D7C0F' };
  if (temperature <= 26) return { label: '舒適', badgeBg: '#FEFCE8', badgeText: '#A16207' };
  if (temperature <= 30) return { label: '微熱', badgeBg: '#FFFBEB', badgeText: '#B45309' };
  if (temperature <= 34) return { label: '偏熱', badgeBg: '#FFF7ED', badgeText: '#C2410C' };
  if (temperature <= 39) return { label: '炎熱', badgeBg: '#FEF2F2', badgeText: '#D7194A' };
  return { label: '酷熱', badgeBg: '#F3E8FF', badgeText: '#8E3E9F' };
}

export function resolveHumidityStatus(value: string): WeatherStatStatus {
  const humidity = numericValue(value);
  if (humidity < 30) return { label: '極乾燥', badgeBg: '#FEF5E7', badgeText: '#B45309' };
  if (humidity <= 40) return { label: '偏乾', badgeBg: '#FEF9E7', badgeText: '#A16207' };
  if (humidity <= 60) return { label: '舒適', badgeBg: '#EAFBF0', badgeText: '#15803D' };
  if (humidity <= 70) return { label: '偏濕', badgeBg: '#EBF5FB', badgeText: '#1D4ED8' };
  if (humidity <= 80) return { label: '潮濕', badgeBg: '#EAF4FB', badgeText: '#1D4ED8' };
  return { label: '極潮濕', badgeBg: '#EAF2F8', badgeText: '#1E40AF' };
}

export function resolveWindStatus(value: string): WeatherStatStatus {
  const speed = numericValue(value);
  if (speed < 0.3) return { label: '無風', badgeBg: '#F8FAFC', badgeText: '#475569' };
  if (speed <= 1.5) return { label: '風弱', badgeBg: '#F1F5F9', badgeText: '#475569' };
  if (speed <= 3.3) return { label: '微風', badgeBg: '#F0FDFA', badgeText: '#0F766E' };
  if (speed <= 5.4) return { label: '有風', badgeBg: '#ECFEFF', badgeText: '#0E7490' };
  if (speed <= 7.9) return { label: '偏強', badgeBg: '#EFF6FF', badgeText: '#2563EB' };
  if (speed <= 10.7) return { label: '強風', badgeBg: '#FFF7ED', badgeText: '#C2410C' };
  if (speed <= 13.8) return { label: '猛烈', badgeBg: '#FEF2F2', badgeText: '#B91C1C' };
  return { label: '危險', badgeBg: '#FFF1F2', badgeText: '#BE123C' };
}
