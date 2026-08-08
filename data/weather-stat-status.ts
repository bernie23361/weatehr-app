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
  if (temperature <= 5) return { label: '嚴寒', badgeBg: '#F5F3FF', badgeText: '#7C3AED' };
  if (temperature <= 10) return { label: '寒冷', badgeBg: '#EFF6FF', badgeText: '#2563EB' };
  if (temperature <= 15) return { label: '偏冷', badgeBg: '#F0F9FF', badgeText: '#0284C7' };
  if (temperature <= 19) return { label: '涼爽', badgeBg: '#ECFEFF', badgeText: '#0891B2' };
  if (temperature <= 26) return { label: '舒適', badgeBg: '#F0FDF4', badgeText: '#22C55E' };
  if (temperature <= 30) return { label: '微熱', badgeBg: '#F7FEE7', badgeText: '#65A30D' };
  if (temperature <= 34) return { label: '悶熱', badgeBg: '#FEFCE8', badgeText: '#CA8A04' };
  if (temperature <= 39) return { label: '炎熱', badgeBg: '#FFF7ED', badgeText: '#F97316' };
  return { label: '酷熱', badgeBg: '#FEF2F2', badgeText: '#EF4444' };
}

export function resolveHumidityStatus(value: string): WeatherStatStatus {
  const humidity = numericValue(value);
  if (humidity < 30) return { label: '乾燥', badgeBg: '#FFF7ED', badgeText: '#F97316' };
  if (humidity < 40) return { label: '偏乾', badgeBg: '#FEFCE8', badgeText: '#CA8A04' };
  if (humidity <= 60) return { label: '適中', badgeBg: '#F0FDF4', badgeText: '#22C55E' };
  if (humidity <= 70) return { label: '偏濕', badgeBg: '#EFF6FF', badgeText: '#3B82F6' };
  if (humidity < 85) return { label: '潮濕', badgeBg: '#EFF6FF', badgeText: '#2563EB' };
  return { label: '高濕', badgeBg: '#EEF2FF', badgeText: '#4F46E5' };
}

export function resolveWindStatus(value: string): WeatherStatStatus {
  const speed = numericValue(value);
  if (speed < 0.3) return { label: '無風', badgeBg: '#F8FAFC', badgeText: '#94A3B8' };
  if (speed <= 1.5) return { label: '風弱', badgeBg: '#F1F5F9', badgeText: '#64748B' };
  if (speed <= 3.3) return { label: '微風', badgeBg: '#F0FDFA', badgeText: '#0D9488' };
  if (speed <= 5.4) return { label: '有風', badgeBg: '#ECFEFF', badgeText: '#0891B2' };
  if (speed <= 7.9) return { label: '偏強', badgeBg: '#EFF6FF', badgeText: '#2563EB' };
  if (speed <= 10.7) return { label: '強風', badgeBg: '#FFF7ED', badgeText: '#F97316' };
  if (speed <= 13.8) return { label: '猛烈', badgeBg: '#FEF2F2', badgeText: '#EF4444' };
  return { label: '危險', badgeBg: '#FFF1F2', badgeText: '#E11D48' };
}
