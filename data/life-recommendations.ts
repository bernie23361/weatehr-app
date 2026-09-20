import type { AppData, LifeSuggestion } from '@/types/weather';

// Product ranking heuristics; these are activity suggestions, not forecast indices.
export function selectLifeRecommendations(data: AppData, suggestions: LifeSuggestion[], now: Date): LifeSuggestion[] {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(now));
  const temperature = Number.parseFloat(data.weather.feelsLike);
  const humidity = Number.parseFloat(data.weather.humidity);
  const wind = Number.parseFloat(data.weather.windSpeed);
  const dry = !/雨|雷|雪|颱/.test(data.weather.status);
  const outdoors = dry && Number.isFinite(temperature) && temperature >= 15 && temperature <= 30
    && Number.isFinite(wind) && wind < 5.5 && Number.isFinite(data.aqi.value) && data.aqi.value <= 100
    && !data.alerts.hasActiveAlarm;
  const candidates: Array<{ score: number; item: LifeSuggestion }> = [];
  const add = (id: string, score: number, label: string, desc: string) => {
    const source = suggestions.find((item) => item.id === id);
    if (source) candidates.push({ score, item: { ...source, label, value: '適合', desc } });
  };

  if (dry && hour >= 7 && hour < 16 && humidity < 70 && wind < 5.5 && !data.alerts.hasActiveAlarm) add('laundry', 95, '曬衣服', '乾爽好晾曬');
  if (outdoors && hour >= 6 && hour < 21) {
    add('bike', 85, '騎單車', '微風好出遊');
    add('sport', hour < 10 || hour >= 16 ? 100 : 75, '戶外運動', '體感舒適');
    add('pet', hour < 10 || hour >= 16 ? 90 : 70, '遛寵物', '散步好時光');
  }
  if (outdoors && hour >= 17 && hour < 23) add('nightmarket', 98, '逛夜市', '晚間好散步');
  const indoor: Array<[string, LifeSuggestion['icon'], string, string]> = [
    ['stretch', 'activity', '室內伸展', '輕鬆活動筋骨'],
    ['read', 'leaf', '靜心閱讀', '享受室內時光'],
    ['organize', 'shirt', '整理衣物', '讓居家更清爽'],
    ['cook', 'soup', '在家料理', '準備暖心餐點'],
  ];
  indoor.forEach(([id, icon, label, desc], index) => candidates.push({
    score: 40 - index,
    item: { id, icon, label, value: '適合', desc, iconBg: '#EFF6FF', iconColor: '#3B82F6' },
  }));
  return candidates.sort((a, b) => b.score - a.score).slice(0, 4).map(({ item }) => item);
}
