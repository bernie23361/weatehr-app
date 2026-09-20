import type { StatLabelTone } from '@/services/app-settings';

export interface WeatherStatStatus {
  label: string;
  badgeBg: string;
  badgeText: string;
}

export type LabelTone = StatLabelTone;

const numericValue = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const feelsLikeWords: Record<LabelTone, string[]> = {
  standard: ['酷寒', '嚴寒', '寒冷', '偏冷', '涼爽', '舒適', '微熱', '偏熱', '炎熱', '酷熱'],
  daily: ['快凍僵', '冷到發抖', '挺冷', '有點涼', '涼爽宜人', '很舒服', '一點點熱', '好熱', '熱翻了', '熱到融化'],
  funny: ['冰箱派對', '皮皮挫', '外套出動', '薄外套', '天氣真好', '舒服想睡', '微汗預備', '汗流成河', '烤地瓜', '進烤箱'],
};

const humidityWords: Record<LabelTone, string[]> = {
  standard: ['極乾燥', '偏乾', '舒適', '偏濕', '潮濕', '極潮濕'],
  daily: ['乾到不行', '有點乾', '剛剛好', '有點濕', '悶悶的', '又濕又悶'],
  funny: ['乾巴巴', '嘴唇乾', '完美保濕', '發黏中', '游泳池', '三溫暖'],
};

const feelsLikeColors = [
  { badgeBg: '#E0F2FE', badgeText: '#0369A1' },
  { badgeBg: '#E0F2FE', badgeText: '#0369A1' },
  { badgeBg: '#DCFCE7', badgeText: '#166534' },
  { badgeBg: '#F0FDF4', badgeText: '#15803D' },
  { badgeBg: '#ECFDF5', badgeText: '#4D7C0F' },
  { badgeBg: '#FEFCE8', badgeText: '#A16207' },
  { badgeBg: '#FFFBEB', badgeText: '#B45309' },
  { badgeBg: '#FFF7ED', badgeText: '#C2410C' },
  { badgeBg: '#FEF2F2', badgeText: '#D7194A' },
  { badgeBg: '#F3E8FF', badgeText: '#8E3E9F' },
];

const humidityColors = [
  { badgeBg: '#FEF5E7', badgeText: '#B45309' },
  { badgeBg: '#FEF9E7', badgeText: '#A16207' },
  { badgeBg: '#EAFBF0', badgeText: '#15803D' },
  { badgeBg: '#EBF5FB', badgeText: '#1D4ED8' },
  { badgeBg: '#EAF4FB', badgeText: '#1D4ED8' },
  { badgeBg: '#EAF2F8', badgeText: '#1E40AF' },
];

interface WindLevel {
  maxSpeed: number;
  badgeBg: string;
  badgeText: string;
  words: Record<LabelTone, string>;
}

const windLevels: WindLevel[] = [
  { maxSpeed: 1.5, badgeBg: '#F8FAFC', badgeText: '#475569', words: { standard: '軟風', daily: '無風感', funny: '風呢？' } },
  { maxSpeed: 3.3, badgeBg: '#F1F5F9', badgeText: '#475569', words: { standard: '輕風', daily: '微風', funny: '涼涼的' } },
  { maxSpeed: 5.4, badgeBg: '#F0FDFA', badgeText: '#0F766E', words: { standard: '微風', daily: '舒服', funny: '很可以' } },
  { maxSpeed: 7.9, badgeBg: '#ECFEFF', badgeText: '#0E7490', words: { standard: '和風', daily: '有風', funny: '頭髮亂' } },
  { maxSpeed: 10.7, badgeBg: '#EFF6FF', badgeText: '#2563EB', words: { standard: '清風', daily: '風偏大', funny: '髮型掰' } },
  { maxSpeed: 13.8, badgeBg: '#DBEAFE', badgeText: '#1D4ED8', words: { standard: '強風', daily: '風很大', funny: '傘抓好' } },
  { maxSpeed: 17.1, badgeBg: '#EFF6FF', badgeText: '#2563EB', words: { standard: '疾風', daily: '強風', funny: '要飛了' } },
  { maxSpeed: 20.7, badgeBg: '#FFF7ED', badgeText: '#C2410C', words: { standard: '大風', daily: '難行走', funny: '人要走' } },
  { maxSpeed: 24.4, badgeBg: '#FEF2F2', badgeText: '#B91C1C', words: { standard: '烈風', daily: '很難走', funny: '吹歪了' } },
  { maxSpeed: 28.4, badgeBg: '#FFF1F2', badgeText: '#BE123C', words: { standard: '狂風', daily: '難站穩', funny: '站不住' } },
  { maxSpeed: 32.6, badgeBg: '#FEE2E2', badgeText: '#991B1B', words: { standard: '暴風', daily: '別外出', funny: '別出去' } },
  { maxSpeed: 36.9, badgeBg: '#FECACA', badgeText: '#7F1D1D', words: { standard: '颶風', daily: '很危險', funny: '快回家' } },
  { maxSpeed: 41.4, badgeBg: '#F3E8FF', badgeText: '#7E22CE', words: { standard: '強烈颶風', daily: '勿外出', funny: '母湯喔' } },
  { maxSpeed: 46.1, badgeBg: '#F3E8FF', badgeText: '#7E22CE', words: { standard: '嚴重颶風', daily: '留室內', funny: '別鬧了' } },
  { maxSpeed: 50.9, badgeBg: '#E9D5FF', badgeText: '#6B21A8', words: { standard: '超級颶風', daily: '極危險', funny: '躲好喔' } },
  { maxSpeed: 56.0, badgeBg: '#F5F3FF', badgeText: '#5B21B6', words: { standard: '極端颶風', daily: '災害風', funny: '拜託躲好' } },
  { maxSpeed: 61.2, badgeBg: '#EDE9FE', badgeText: '#4C1D95', words: { standard: '災難性風', daily: '毀壞風', funny: '太扯了' } },
  { maxSpeed: Infinity, badgeBg: '#EDE9FE', badgeText: '#3B0764', words: { standard: '極致颶風', daily: '極端風', funny: '這是風？' } },
];

export function resolveFeelsLikeStatus(value: string, tone: LabelTone = 'standard'): WeatherStatStatus {
  const temperature = numericValue(value);
  const color = temperature < 5 ? feelsLikeColors[0]
    : temperature <= 10 ? feelsLikeColors[1]
    : temperature <= 15 ? feelsLikeColors[2]
    : temperature <= 19 ? feelsLikeColors[3]
    : temperature <= 23 ? feelsLikeColors[4]
    : temperature <= 26 ? feelsLikeColors[5]
    : temperature <= 30 ? feelsLikeColors[6]
    : temperature <= 34 ? feelsLikeColors[7]
    : temperature <= 39 ? feelsLikeColors[8]
    : feelsLikeColors[9];
  const index = feelsLikeColors.indexOf(color);
  return {
    label: feelsLikeWords[tone][index] ?? feelsLikeWords.standard[index],
    badgeBg: color.badgeBg,
    badgeText: color.badgeText,
  };
}

export function resolveHumidityStatus(value: string, tone: LabelTone = 'standard'): WeatherStatStatus {
  const humidity = numericValue(value);
  const color = humidity < 30 ? humidityColors[0]
    : humidity <= 40 ? humidityColors[1]
    : humidity <= 60 ? humidityColors[2]
    : humidity <= 70 ? humidityColors[3]
    : humidity <= 80 ? humidityColors[4]
    : humidityColors[5];
  const index = humidityColors.indexOf(color);
  return {
    label: humidityWords[tone][index] ?? humidityWords.standard[index],
    badgeBg: color.badgeBg,
    badgeText: color.badgeText,
  };
}

export function resolveWindStatus(value: string, tone: LabelTone = 'standard'): WeatherStatStatus {
  const speed = numericValue(value);
  const level = windLevels.find((item) => speed <= item.maxSpeed) ?? windLevels[windLevels.length - 1];
  return {
    label: level.words[tone] ?? level.words.standard,
    badgeBg: level.badgeBg,
    badgeText: level.badgeText,
  };
}
