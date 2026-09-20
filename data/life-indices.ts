import type { LifeIndex, LifeIndexLevel } from '@/types/weather';

// 生活指數目前為靜態資料；待氣象 API 提供對應欄位後，
// 可在此檔案內依 weatherApi 回傳值改為動態判定（規則集中於此，頁面不需改動）。
export const lifeIndices: LifeIndex[] = [
  {
    id: 'uv', icon: 'sun', label: '紫外線', value: '中高', level: 'medium',
    desc: '適度防曬', tips: '正午前後紫外線較強，外出建議塗抹防曬、戴帽子或撐傘。',
    iconBg: '#FEFCE8', iconColor: '#EAB308', badgeBg: '#FEF3C7', badgeText: '#B45309',
  },
  {
    id: 'dress', icon: 'user', label: '穿衣', value: '薄長袖', level: 'good',
    desc: '早晚微涼', tips: '白天溫暖，早晚溫差明顯，建議洋蔥式穿搭並備薄外套。',
    iconBg: '#EFF6FF', iconColor: '#3B82F6', badgeBg: '#DBEAFE', badgeText: '#2563EB',
  },
  {
    id: 'carwash', icon: 'car', label: '洗車', value: '適宜', level: 'good',
    desc: '天氣穩定', tips: '近期無明顯降雨，洗後不易沾污，適合安排洗車。',
    iconBg: '#F0FDF4', iconColor: '#22C55E', badgeBg: '#DCFCE7', badgeText: '#16A34A',
  },
  {
    id: 'sport', icon: 'activity', label: '運動', value: '適宜', level: 'good',
    desc: '體感舒適', tips: '風速與濕度都適中，適合晨間或傍晚進行戶外運動。',
    iconBg: '#F0FDFA', iconColor: '#14B8A6', badgeBg: '#CCFBF1', badgeText: '#0D9488',
  },
  {
    id: 'cold', icon: 'thermometer', label: '感冒', value: '易發', level: 'bad',
    desc: '日夜溫差大', tips: '早晚氣溫落差較大，長輩與孩童請注意添衣保暖。',
    iconBg: '#FAF5FF', iconColor: '#A855F7', badgeBg: '#F3E8FF', badgeText: '#9333EA',
  },
  {
    id: 'laundry', icon: 'shirt', label: '晾曬', value: '適合', level: 'good',
    desc: '乾爽好晾曬', tips: '濕度適中、日照充足，衣物可安心晾在戶外。',
    iconBg: '#F0FDF4', iconColor: '#22C55E', badgeBg: '#DCFCE7', badgeText: '#16A34A',
  },
  {
    id: 'air', icon: 'leaf', label: '空品', value: '良好', level: 'good',
    desc: '空氣清新', tips: '空氣品質良好，適合開窗通風與戶外活動。',
    iconBg: '#ECFDF5', iconColor: '#10B981', badgeBg: '#D1FAE5', badgeText: '#059669',
  },
  {
    id: 'travel', icon: 'map', label: '旅遊', value: '適合', level: 'good',
    desc: '天氣穩定', tips: '天氣穩定適合安排戶外行程，記得留意午後紫外線。',
    iconBg: '#EEF2FF', iconColor: '#6366F1', badgeBg: '#E0E7FF', badgeText: '#4F46E5',
  },
  {
    id: 'fish', icon: 'fish', label: '釣魚', value: '尚可', level: 'medium',
    desc: '風速平穩', tips: '風浪平穩，清晨與傍晚時段水溫較佳。',
    iconBg: '#E0F2FE', iconColor: '#0EA5E9', badgeBg: '#BAE6FD', badgeText: '#0284C7',
  },
  {
    id: 'comfort', icon: 'heart', label: '舒適度', value: '舒適', level: 'good',
    desc: '溫濕宜人', tips: '溫度濕度皆在舒適範圍，體感良好。',
    iconBg: '#FFF1F2', iconColor: '#F43F5E', badgeBg: '#FFE4E6', badgeText: '#E11D48',
  },
  {
    id: 'umbrella', icon: 'umbrella', label: '雨傘', value: '不必帶', level: 'good',
    desc: '無降雨跡象', tips: '目前天氣穩定，短時間內無明顯降雨跡象。',
    iconBg: '#EFF6FF', iconColor: '#3B82F6', badgeBg: '#DBEAFE', badgeText: '#2563EB',
  },
  {
    id: 'allergy', icon: 'sprout', label: '過敏', value: '中等', level: 'medium',
    desc: '敏感者留意', tips: '花粉與懸浮微粒濃度平穩，過敏體質外出仍建議配戴口罩。',
    iconBg: '#ECFDF5', iconColor: '#10B981', badgeBg: '#D1FAE5', badgeText: '#059669',
  },
];

export const lifeIndexLevelBadge: Record<LifeIndexLevel, { badgeBg: string; badgeText: string }> = {
  good: { badgeBg: '#DCFCE7', badgeText: '#16A34A' },
  medium: { badgeBg: '#DBEAFE', badgeText: '#2563EB' },
  bad: { badgeBg: '#FEF3C7', badgeText: '#B45309' },
  risk: { badgeBg: '#FEE2E2', badgeText: '#DC2626' },
};