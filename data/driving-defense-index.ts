import type { AppData } from '@/types/weather';
import type { VehicleType } from '@/services/app-settings';

export type DefenseLevel = 'good' | 'watch' | 'danger';

export type DefenseTone = 'good' | 'watch' | 'danger';

export interface DefenseFactor {
  label: string;
  tone: DefenseTone;
}

export interface MotoDefenseInput {
  rainIntensity: number | null;
  rainProb1h: number | null;
  windSpeed: number;
  visibilityKm: number | null;
  aqi: number;
  temp: number;
  severeAdvisory: boolean;
  heavyRainNow: boolean;
}

export interface DrivingDefenseIndex {
  score: number;
  level: DefenseLevel;
  levelLabel: string;
  levelColor: string;
  levelBg: string;
  factors: DefenseFactor[];
  advice: string[];
  dots?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const numericValue = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function pushFactor(factors: DefenseFactor[], label: string, tone: DefenseTone) {
  if (!factors.some((factor) => factor.label === label)) factors.push({ label, tone });
}

interface MotoLevel {
  min: number;
  label: string;
  color: string;
  bg: string;
  dots: number;
  advice: string;
}

const MOTO_LEVELS: MotoLevel[] = [
  { min: 90, label: 'GO！', color: '#16A34A', bg: '#DCFCE7', dots: 0, advice: '天氣極佳！適合騎車出遊，但請仍需注意防曬。' },
  { min: 70, label: '良好', color: '#16A34A', bg: '#DCFCE7', dots: 1, advice: '天氣大致穩定，仍請保持安全車距並留意周遭路況。' },
  { min: 50, label: '需注意', color: '#CA8A04', bg: '#FEF9C3', dots: 2, advice: '風速稍大或有零星降雨，建議放慢車速，攜帶雨具。' },
  { min: 30, label: '警戒', color: '#EA580C', bg: '#FFEDD5', dots: 3, advice: '視線不良或路面濕滑，請開啟大燈，避免急煞。' },
  { min: 10, label: '危險', color: '#DC2626', bg: '#FEE2E2', dots: 4, advice: '強風或大雨，騎車風險極高，強烈建議搭乘大眾運輸。' },
  { min: 0, label: '極度危險', color: '#991B1B', bg: '#FECACA', dots: 5, advice: '颱風/豪雨警報，請勿騎車上路！' },
];

function resolveMotorcycle(input: MotoDefenseInput): DrivingDefenseIndex {
  const rainNow = (input.rainIntensity ?? 0) > 0;
  const wind = input.windSpeed;
  const factors: DefenseFactor[] = [];

  if (input.severeAdvisory) {
    const extreme = MOTO_LEVELS[MOTO_LEVELS.length - 1];
    return {
      score: 0,
      level: 'danger',
      levelLabel: extreme.label,
      levelColor: extreme.color,
      levelBg: extreme.bg,
      factors: [],
      advice: [extreme.advice],
      dots: extreme.dots,
    };
  }

  let score = 100;
  const visibility = input.visibilityKm;

  if (rainNow) {
    score -= 30;
    pushFactor(factors, '下雨', input.heavyRainNow ? 'danger' : 'watch');
  }
  if ((input.rainProb1h ?? 0) > 50) {
    score -= 15;
    pushFactor(factors, '降雨機率', 'watch');
  }
  if (wind > 5) score -= 15;
  if (wind > 8) score -= 15;
  if (wind > 12) score -= 20;
  if (wind > 5) {
    pushFactor(factors, '強風', wind > 12 ? 'danger' : 'watch');
  }
  if (visibility != null && visibility < 5) {
    score -= 10;
    if (visibility < 2) score -= 10;
    if (visibility < 1) score -= 20;
    pushFactor(factors, '能見度', visibility < 2 ? 'danger' : 'watch');
  }
  if (input.aqi > 100) {
    score -= 15;
    if (input.aqi > 150) score -= 15;
    pushFactor(factors, '空品', input.aqi > 150 ? 'danger' : 'watch');
  }
  if (input.temp > 35) {
    score -= 15;
    pushFactor(factors, '高溫', 'watch');
  }
  if (input.temp < 12) {
    score -= 15;
    pushFactor(factors, '低溫', 'watch');
  }

  let final = clamp(Math.round(score), 0, 100);
  if (input.heavyRainNow && wind > 8) final = Math.min(final, 30);

  const level = MOTO_LEVELS.find((item) => final >= item.min) ?? MOTO_LEVELS[MOTO_LEVELS.length - 1];
  return {
    score: final,
    level: final >= 50 ? (final >= 70 ? 'good' : 'watch') : 'danger',
    levelLabel: level.label,
    levelColor: level.color,
    levelBg: level.bg,
    factors,
    advice: [level.advice],
    dots: level.dots,
  };
}

function resolveCar(data: AppData): DrivingDefenseIndex {
  const status = data.weather.status ?? '';
  const wind = numericValue(data.weather.windSpeed);
  const humidity = numericValue(data.weather.humidity);
  const feelsLike = numericValue(data.weather.feelsLike);

  let score = 100;
  const factors: DefenseFactor[] = [];

  const hasRain = /雨|陣雨|雷|豪雨|雷雨/.test(status);
  const severeRain = data.srdi === 'alert' || data.srdi === 'danger';
  const hasMist = /霧|霾/.test(status);
  const isHot = feelsLike >= 35;
  const isCold = feelsLike <= 10;

  if (hasRain || severeRain) {
    score -= severeRain ? 35 : 18;
    pushFactor(factors, '雨天路滑', severeRain ? 'danger' : 'watch');
  }
  if (wind >= 8) {
    const severe = wind >= 13.9;
    score -= severe ? 30 : wind >= 10.8 ? 18 : 10;
    pushFactor(factors, '強風', severe ? 'danger' : 'watch');
  }
  if (hasMist || humidity >= 88) {
    score -= hasMist ? 12 : 8;
    pushFactor(factors, '能見度', hasMist ? 'danger' : 'watch');
  }
  if (isHot || isCold) {
    score -= 8;
    pushFactor(factors, isHot ? '高溫' : '低溫', 'watch');
  }

  const clampedScore = clamp(Math.round(score), 0, 100);
  const level: DefenseLevel = clampedScore >= 80 ? 'good' : clampedScore >= 60 ? 'watch' : 'danger';
  const levelMeta = {
    good: { label: '良好', color: '#16A34A', bg: '#DCFCE7' },
    watch: { label: '注意', color: '#B45309', bg: '#FEF3C7' },
    danger: { label: '危險', color: '#DC2626', bg: '#FEE2E2' },
  }[level];

  const advice: string[] = [];
  if (level === 'good') {
    advice.push('天氣大致穩定，仍請保持安全車距並留意周遭路況。');
  } else {
    if (hasRain || severeRain) {
      advice.push('雨天請放慢車速、開啟頭燈並拉長安全車距。');
    }
    if (wind >= 8) {
      advice.push('強風時請握穩方向盤，留意橫風路段與大型車揚起的氣流。');
    }
    if (hasMist || humidity >= 88) {
      advice.push('能見度不佳請開啟霧燈或近光燈，與前車保持安全距離。');
    }
    if (isHot) advice.push('高溫行車請留意水溫與胎壓，避免長時間疲勞駕駛。');
    if (isCold) advice.push('低溫請開啟除霧並預熱車室，留意結冰路面。');
    if (advice.length === 0) advice.push('天候略有變化，請減速行駛並留意周邊路況。');
  }

  return {
    score: clampedScore,
    level,
    levelLabel: levelMeta.label,
    levelColor: levelMeta.color,
    levelBg: levelMeta.bg,
    factors,
    advice: [...new Set(advice)],
  };
}

const defaultMotoInput = (data: AppData): MotoDefenseInput => ({
  rainIntensity: null,
  rainProb1h: null,
  windSpeed: numericValue(data.weather.windSpeed),
  visibilityKm: null,
  aqi: data.aqi.value,
  temp: numericValue(data.weather.temp),
  severeAdvisory: false,
  heavyRainNow: false,
});

export function resolveDrivingDefenseIndex(data: AppData, vehicle: VehicleType, motoInput?: MotoDefenseInput): DrivingDefenseIndex {
  if (vehicle === 'motorcycle') return resolveMotorcycle(motoInput ?? defaultMotoInput(data));
  return resolveCar(data);
}