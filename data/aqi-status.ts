export interface AqiStatus {
  label: string;
  phrase: string;
  color: string;
  textColor: string;
  indicatorPercent: number;
  indicatorColor: string;
}

const AQI_LEVELS = [
  { max: 50, label: '良好', color: '#22C55E', textColor: '#16A34A' },
  { max: 100, label: '普通', color: '#FACC15', textColor: '#CA8A04' },
  { max: 150, label: '對敏感族群不健康', color: '#F97316', textColor: '#EA580C' },
  { max: 200, label: '對所有族群不健康', color: '#EF4444', textColor: '#DC2626' },
  { max: 300, label: '非常不健康', color: '#8B5CF6', textColor: '#7C3AED' },
  { max: 500, label: '危害', color: '#7F1D1D', textColor: '#7F1D1D' },
] as const;

const AQI_PHRASES = [
  { max: 25, phrase: '空氣很清新，放心享受戶外活動。' },
  { max: 50, phrase: '空氣品質良好，很適合外出走走。' },
  { max: 75, phrase: '空氣還不錯，日常活動不太受影響。' },
  { max: 100, phrase: '空氣品質普通，敏感族群可稍微留意。' },
  { max: 125, phrase: '空氣開始變差，敏感族群建議減少久留戶外。' },
  { max: 150, phrase: '空氣品質偏差，敏感族群外出請多加留意。' },
  { max: 175, phrase: '空氣品質不佳，建議減少長時間戶外活動。' },
  { max: 200, phrase: '空氣品質較差，外出活動建議適度縮短。' },
  { max: 250, phrase: '空氣品質很差，建議減少不必要的戶外活動。' },
  { max: 300, phrase: '空氣品質非常差，請盡量避免長時間待在戶外。' },
  { max: 400, phrase: '空氣污染嚴重，建議避免戶外活動並做好防護。' },
  { max: 500, phrase: '空氣污染達危害程度，請盡量留在室內並做好防護。' },
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => ({
  r: Number.parseInt(hex.slice(1, 3), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  b: Number.parseInt(hex.slice(5, 7), 16),
});

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

const mixHexColor = (from: string, to: string, progress: number) => {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const amount = clamp(progress, 0, 1);
  return rgbToHex({
    r: start.r + (end.r - start.r) * amount,
    g: start.g + (end.g - start.g) * amount,
    b: start.b + (end.b - start.b) * amount,
  });
};

function resolveIndicatorPercent(value: number): number {
  const aqi = clamp(value, 0, 200);
  return (aqi / 200) * 100;
}

function resolveIndicatorColor(indicatorPercent: number): string {
  const progress = clamp(indicatorPercent, 0, 100) / 100;
  if (progress <= 0.5) return mixHexColor('#4ADE80', '#FACC15', progress / 0.5);
  return mixHexColor('#FACC15', '#8B4513', (progress - 0.5) / 0.5);
}

export function resolveAqiStatus(value: number, fallbackLabel?: string): AqiStatus {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const level = AQI_LEVELS.find((item) => normalizedValue <= item.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
  const phraseLevel = AQI_PHRASES.find((item) => normalizedValue <= item.max) ?? AQI_PHRASES[AQI_PHRASES.length - 1];
  const indicatorPercent = resolveIndicatorPercent(normalizedValue);

  return {
    label: fallbackLabel?.trim() || level.label,
    phrase: phraseLevel.phrase,
    color: level.color,
    textColor: level.textColor,
    indicatorPercent,
    indicatorColor: resolveIndicatorColor(indicatorPercent),
  };
}
