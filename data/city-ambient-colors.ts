const cityAmbientColors: Record<string, string> = {
  '基隆市': '#E7F2F7',
  '臺北市': '#EDF0F6',
  '臺中市': '#E7F3F6',
  '臺南市': '#F8EAE7',
  '高雄市': '#E5F2F7',
  '臺東縣': '#E6EFF6',
};

export const defaultWeatherCardGradientColors = [
  'rgba(224,242,254,0.70)',
  'rgba(239,246,255,0.30)',
  'rgba(255,255,255,0)',
] as const;

export const resolveWeatherCardGradientColors = (city: string) => {
  const ambientColor = cityAmbientColors[city];
  if (!ambientColor) return defaultWeatherCardGradientColors;

  return [`${ambientColor}B3`, `${ambientColor}4D`, 'rgba(255,255,255,0)'] as const;
};
