import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const TYPHOON_COVER_IMAGE_URI = '';

type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  background: string;
  steps: string[];
};

const scenarios: Scenario[] = [
  {
    id: 'home', title: '在家裡', subtitle: '關窗防風、遠離玻璃', color: '#3182F6', background: '#EAF4FF',
    steps: ['關閉並加固門窗，遠離窗戶與玻璃，避免強風灌入。', '準備照明與行動電源，停電時不要慌亂，待在安全角落。', '注意屋內漏水與積水，提早處理，避免淹水擴大。'],
  },
  {
    id: 'outdoor', title: '外出時', subtitle: '避免外出、遠離危險物', color: '#2563EB', background: '#EFF6FF',
    steps: ['颱風影響期間避免外出，不要在風雨最強時冒險移動。', '若已在外面，遠離招牌、樹木、電線桿與工地圍籬。', '不要靠近河川、海邊、堤防與低窪地區，立刻回到安全處。'],
  },
  {
    id: 'driving', title: '行車中', subtitle: '靠邊停、勿涉水', color: '#1D4ED8', background: '#EFF6FF',
    steps: ['風雨強勁時靠邊暫停，開啟警示燈，避免行經橋梁與高架。', '遇到積水路段不要冒險通過，水深不明時立刻掉頭或停車。', '車輛若拋錨，盡速離開並移至高處，撥打救援電話求助。'],
  },
  {
    id: 'lowland', title: '低窪地區', subtitle: '及早撤離、聽從指示', color: '#3B82F6', background: '#EEF6FF',
    steps: ['低窪、易淹水或土石流警戒區居民，提早準備撤離。', '依政府發布的撤離指示前往避難處，不要等到淹水才行動。', '撤離時關閉瓦斯與電源，攜帶重要證件與急救用品。'],
  },
];

type BulletItem = { label?: string; text: string };

type FirstResponseUnit = {
  id: string;
  number: string;
  title: string;
  summary: string;
  color: string;
  background: string;
  intro: string;
  paragraphs?: string[];
  quotes?: string[];
  bulletLabel: string;
  bullets: BulletItem[];
  closing: string;
};

type Phase = {
  id: 'prepare' | 'during' | 'after';
  title: string;
  intro: string;
  flow: [string, string, string];
  units: FirstResponseUnit[];
};

const phases: Phase[] = [
  {
    id: 'prepare', title: '災前準備',
    intro: '颱風登陸前通常有數天預警時間，趁風雨來臨前做好準備，能大幅降低風險。\n\n颱風季節來臨前，先儲備物資、固定戶外物品、確認避難資訊，風雨來時才能從容應對。',
    flow: ['儲備', '固定', '規劃'],
    units: [
      {
        id: 'stock', number: '01', title: '儲備物資', summary: '至少 3 天份民生必需品', color: '#3182F6', background: '#EAF4FF',
        intro: '準備至少 3 天份的民生必需品，停水停電時也能應對。',
        paragraphs: ['颱風可能造成停水、停電與道路中斷，事先儲備才能減少不便。'],
        bulletLabel: '準備這些物品：',
        bullets: [
          { text: '飲用水與乾糧（每人至少 3 天份）' },
          { text: '手電筒、電池、行動電源與收音機' },
          { text: '急救用品、常用藥品與身分證件影本' },
          { text: '現金、充電器材與輕便雨具' },
          { text: '行動不便者與寵物所需的用品' },
        ],
        closing: '每半年檢查一次，更換過期品並確認數量足夠。',
      },
      {
        id: 'secure', number: '02', title: '固定防護', summary: '檢查門窗與戶外物品', color: '#2563EB', background: '#EFF6FF',
        intro: '檢查並固定家中與戶外易受風雨影響的物品，是防颱的關鍵。',
        bulletLabel: '檢查項目：',
        bullets: [
          { text: '固定或收入戶外盆栽、招牌與易飛散物品' },
          { text: '檢查並加固門窗，準備防水膠帶與沙包' },
          { text: '清理陽台與排水溝，確保排水暢通' },
          { text: '修剪枯枝，檢查屋頂與遮雨棚是否牢固' },
          { text: '汽車加滿油，停放至安全位置' },
        ],
        closing: '環境越穩固，風雨來襲時越安心。',
      },
      {
        id: 'plan', number: '03', title: '規劃避難', summary: '先查好避難資訊', color: '#1D4ED8', background: '#EFF6FF',
        intro: '事先了解避難資訊，颱風來時才知道該怎麼做。',
        bulletLabel: '一起做好：',
        bullets: [
          { text: '查詢住家附近的避難場所與撤離路線' },
          { text: '與家人約定聯絡方式與集合點' },
          { text: '掌握颱風動態與政府發布的警報' },
          { text: '低窪、易淹水或土石流警戒區居民，提早準備撤離' },
        ],
        closing: '事前規劃，緊急時刻才不會手忙腳亂。',
      },
    ],
  },
  {
    id: 'during', title: '災時應變',
    intro: '颱風影響期間避免外出，待在安全的室內，並隨時留意警報與最新資訊。',
    flow: ['留守', '警戒', '應變'],
    units: [
      {
        id: 'stay', number: '01', title: '居家留守', summary: '待在室內、遠離門窗', color: '#2563EB', background: '#EFF6FF',
        intro: '風雨最強時，待在室內最安全，不要外出觀浪或拍照。',
        bulletLabel: '記住：',
        bullets: [
          { text: '關閉門窗，遠離玻璃與窗戶' },
          { text: '不要外出，避免被招牌、樹枝或掉落物擊中' },
          { text: '不靠近河川、海邊與低窪地區' },
          { text: '若身處不安全建築，依指示前往避難處' },
        ],
        closing: '留在安全處，等風雨減弱再行動。',
      },
      {
        id: 'alert', number: '02', title: '隨時警戒', summary: '掌握警報與最新資訊', color: '#3B82F6', background: '#EEF6FF',
        intro: '颱風路徑隨時可能變化，持續關注最新資訊。',
        bulletLabel: '記得：',
        bullets: [
          { text: '收聽新聞、廣播與手機警報' },
          { text: '留意停電或斷訊，備妥照明與行動電源' },
          { text: '不要使用電梯，避免停電受困' },
          { text: '注意家中漏水與積水，及早處理' },
        ],
        closing: '掌握資訊，才能在第一時間採取正確行動。',
      },
      {
        id: 'respond', number: '03', title: '緊急應變', summary: '安全優先、必要時撤離', color: '#1D4ED8', background: '#EFF6FF',
        intro: '若發生淹水、停電或其他緊急狀況，先確保自身安全。',
        bulletLabel: '處理重點：',
        bullets: [
          { text: '屋內進水時先關閉總電源，避免觸電' },
          { text: '身處土石流或淹水警戒區，依指示立即撤離' },
          { text: '停電時關閉電器插頭，避免復電時發生突波' },
          { text: '受傷或受困時撥打 119，說明位置與狀況' },
        ],
        closing: '安全第一，必要時放棄物品也要保護生命。',
      },
    ],
  },
  {
    id: 'after', title: '災後處置',
    intro: '颱風過後，先確認環境安全再外出，留意掉落物、積水與潛在風險。',
    flow: ['檢查', '清整', '回報'],
    units: [
      {
        id: 'inspect', number: '01', title: '檢查安全', summary: '確認環境無立即危險', color: '#1D4ED8', background: '#EFF6FF',
        intro: '先檢查住家與周邊環境，確認沒有立即危險再行動。',
        bulletLabel: '檢查重點：',
        bullets: [
          { text: '檢查瓦斯、電線與漏水，聞到瓦斯味先關閉並遠離' },
          { text: '不要碰觸或靠近倒落的電線與路樹' },
          { text: '檢查屋頂、牆壁與門窗是否受損' },
          { text: '確認建築結構安全後再進入' },
        ],
        closing: '安全確認優先，避免二次傷害。',
      },
      {
        id: 'clean', number: '02', title: '清整環境', summary: '清理積水、防止疫病', color: '#2563EB', background: '#EFF6FF',
        intro: '清理積水與落葉，防止蚊蟲滋生與疫病發生。',
        bulletLabel: '清理重點：',
        bullets: [
          { text: '清除積水與垃圾，必要時噴灑消毒' },
          { text: '丟棄泡水或腐壞的食物與物品' },
          { text: '飲用水若受污染，煮沸後再使用' },
          { text: '注意環境衛生，預防傳染病' },
        ],
        closing: '環境乾淨，復原更快。',
      },
      {
        id: 'report', number: '03', title: '通報求援', summary: '通報災情、尋求協助', color: '#3B82F6', background: '#EEF6FF',
        intro: '道路中斷、淹水或有人受傷時，依情況通報求助。',
        bulletLabel: '通報時：',
        bullets: [
          { text: '道路中斷、土石流或淹水，通報相關單位處理' },
          { text: '有人受傷或受困撥打 119，說明位置與人數' },
          { text: '遵守政府發布的災後指示與注意事項' },
          { text: '留意後續天氣變化，保持警覺' },
        ],
        closing: '通報清楚，救援才能更有效率。',
      },
    ],
  },
];

function ArrowLeftIcon() {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function TyphoonHeroScene() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 430 420" preserveAspectRatio="xMidYMid slice">
      <Rect width="430" height="420" fill="#151B2B" />
      <Circle cx="330" cy="96" r="120" fill="#1D4ED8" opacity={0.4} />
      <Circle cx="70" cy="150" r="150" fill="#0891B2" opacity={0.32} />
      <Path d="M0 300h430v120H0z" fill="#0B1020" />
      <Path d="M0 300l52-20v140H0V300zm70-30h58v170H70V270zm74 48h74v152h-74V318zm90-96h92v230h-92V222zm110 44h86v186h-86V266z" fill="#0E1424" />
      <Path d="M312 92c0 22-18 40-40 40s-40-18-40-40 18-40 40-40 40 18 40 40Z" fill="none" stroke="#7DD3FC" strokeWidth={3} opacity={0.7} />
      <Path d="M292 92c0 11-9 20-20 20s-20-9-20-20 9-20 20-20 20 9 20 20Z" fill="none" stroke="#BAE6FD" strokeWidth={2} opacity={0.8} />
      <Path d="M60 300c16 6 34-4 44-14 12-12 30-14 44-6 14 8 30 8 44 0 14-8 32-8 46 0 12 7 26 10 40 6 16-4 34 0 48 10l104 24v0H60z" fill="#11182A" opacity={0.95} />
      <Path d="M0 316l60 12 74-8 76 14 90-10 130 18v8H0z" fill="#2563EB" opacity={0.3} />
      <Circle cx="326" cy="122" r="22" fill="#38BDF8" opacity={0.22} />
      <Circle cx="326" cy="122" r="9" fill="#7DD3FC" opacity={0.85} />
    </Svg>
  );
}

export function TyphoonResponseScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState('home');
  const [activePhase, setActivePhase] = useState<Phase['id']>('prepare');
  const [phaseMenuOpen, setPhaseMenuOpen] = useState(false);
  const [firstExpanded, setFirstExpanded] = useState('stock');
  const currentPhase = phases.find((p) => p.id === activePhase) ?? phases[0];

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F7FA' }}>
      <StatusBar style="light" backgroundColor="#151B2B" />
      <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" style={{ backgroundColor: '#151B2B' }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24, backgroundColor: '#F6F7FA' }}>
        <View style={{ position: 'relative' }}>
          {phaseMenuOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="關閉階段選單"
              onPress={() => setPhaseMenuOpen(false)}
              style={{ position: 'absolute', inset: 0, zIndex: 40, backgroundColor: 'rgba(15,23,42,0.18)' }}
            />
          ) : null}
          <View style={{ height: 420, overflow: 'hidden', backgroundColor: '#151B2B' }}>
            {TYPHOON_COVER_IMAGE_URI ? (
              <Image
                source={{ uri: TYPHOON_COVER_IMAGE_URI }}
                contentFit="cover"
                style={{ position: 'absolute', inset: 0 }}
              />
            ) : (
              <TyphoonHeroScene />
            )}
            <LinearGradient colors={['rgba(9,13,24,0.02)', 'rgba(9,13,24,0.16)', '#111725']} locations={[0, 0.48, 1]} style={{ position: 'absolute', inset: 0 }} />
            <Pressable accessibilityRole="button" accessibilityLabel="返回防災指南" onPress={onBack} hitSlop={8} style={({ pressed }) => ({ position: 'absolute', top: Math.max(insets.top, 14) + 4, left: 18, width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' })}>
              <ArrowLeftIcon />
            </Pressable>
            <View style={{ position: 'absolute', left: 22, right: 22, bottom: 25, gap: 10 }}>
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(49,130,246,0.9)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>SAFETY GUIDE</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 32, lineHeight: 38, fontWeight: '800' }}>颱風準備</Text>
              <Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 14, lineHeight: 21 }}>事前做好準備，風雨來時從容應對</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 18, paddingTop: 22, gap: 22 }}>
            <View style={{ gap: 12 }}>
              <View style={{ position: 'relative', zIndex: 50 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#172033', fontSize: 20, fontWeight: '800' }}>{currentPhase.title}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`目前階段：${currentPhase.title}，點擊切換`}
                    onPress={() => setPhaseMenuOpen((v) => !v)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: pressed ? '#DBEAFE' : '#EAF4FF', borderWidth: 1, borderColor: '#BFDBFE' })}
                  >
                    <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '800' }}>{currentPhase.title}</Text>
                    <Text style={{ color: '#1D4ED8', fontSize: 10, transform: [{ rotate: phaseMenuOpen ? '180deg' : '0deg' }] }}>▼</Text>
                  </Pressable>
                </View>
                {phaseMenuOpen ? (
                  <View style={{ position: 'absolute', top: 44, right: 0, zIndex: 60, width: 168, padding: 6, borderRadius: 18, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F7', boxShadow: '0 12px 32px rgba(15,23,42,0.16)' }}>
                    {phases.map((option) => {
                      const selected = option.id === activePhase;
                      return (
                        <Pressable
                          key={option.id}
                          accessibilityRole="button"
                          accessibilityLabel={`切換到${option.title}`}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            setActivePhase(option.id);
                            setFirstExpanded(option.units[0].id);
                            setPhaseMenuOpen(false);
                          }}
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 13, backgroundColor: pressed ? '#F8FAFC' : selected ? '#EAF4FF' : '#FFFFFF' })}
                        >
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selected ? '#3182F6' : '#E2E8F0' }} />
                          <Text style={{ color: selected ? '#1D4ED8' : '#334155', fontSize: 14, fontWeight: selected ? '800' : '600' }}>{option.title}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
              <Text style={{ color: '#667085', fontSize: 13, lineHeight: 20 }}>
                {currentPhase.intro}
              </Text>
              <View style={{ gap: 6 }}>
                <Text style={{ color: '#172033', fontSize: 14, fontWeight: '800' }}>記住三件事</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {currentPhase.flow.map((step, index, arr) => (
                    <View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#DBEAFE' }}>
                        <Text style={{ color: '#1D4ED8', fontSize: 13, fontWeight: '800' }}>{step}</Text>
                      </View>
                      {index < arr.length - 1 ? <Text style={{ color: '#C4C9D4', fontSize: 14, fontWeight: '700' }}>→</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
              {currentPhase.units.map((item) => {
                const isOpen = firstExpanded === item.id;
                return (
                  <View key={item.id} style={{ overflow: 'hidden', borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: isOpen ? item.color : '#EEF2F7' }}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setFirstExpanded(isOpen ? '' : item.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF' })}>
                      <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: item.background }}>
                        <Text style={{ color: item.color, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{item.number}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ color: '#202A3C', fontSize: 15, fontWeight: '700' }}>{item.title}</Text>
                        <Text style={{ color: '#8A94A6', fontSize: 12 }}>{item.summary}</Text>
                      </View>
                      <Text style={{ color: '#98A2B3', fontSize: 22, transform: [{ rotate: isOpen ? '45deg' : '0deg' }] }}>＋</Text>
                    </Pressable>
                    {isOpen ? (
                      <View style={{ paddingHorizontal: 17, paddingBottom: 18, gap: 14 }}>
                        <Text style={{ color: '#202A3C', fontSize: 14, fontWeight: '700', lineHeight: 21 }}>{item.intro}</Text>
                        {item.paragraphs?.map((p, index) => (
                          <Text key={index} style={{ color: '#596579', fontSize: 13, lineHeight: 20 }}>{p}</Text>
                        ))}
                        {item.quotes ? (
                          <View style={{ gap: 8 }}>
                            {item.quotes.map((q) => (
                              <View key={q} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: item.background, borderLeftWidth: 3, borderLeftColor: item.color }}>
                                <Text style={{ color: item.color, fontSize: 13, fontWeight: '700', lineHeight: 19 }}>{q}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        <Text style={{ color: '#202A3C', fontSize: 13, fontWeight: '700', lineHeight: 19 }}>{item.bulletLabel}</Text>
                        <View style={{ gap: 8 }}>
                          {item.bullets.map((b, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 9 }}>
                              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: item.color, marginTop: 7 }} />
                              <Text style={{ flex: 1, color: '#596579', fontSize: 13, lineHeight: 19 }}>
                                {b.label ? <Text style={{ color: item.color, fontWeight: '700' }}>{b.label}</Text> : null}
                                {b.text}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <Text style={{ color: '#596579', fontSize: 13, lineHeight: 20, fontWeight: '500' }}>{item.closing}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={{ color: '#172033', fontSize: 20, fontWeight: '800' }}>依情境應變</Text>
              {scenarios.map((item) => {
                const isOpen = expanded === item.id;
                return (
                  <View key={item.id} style={{ overflow: 'hidden', borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: isOpen ? item.color : '#EEF2F7' }}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setExpanded(isOpen ? '' : item.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF' })}>
                      <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: item.background }}>
                        <View style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: item.color, transform: [{ rotate: '45deg' }] }} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ color: '#202A3C', fontSize: 15, fontWeight: '700' }}>{item.title}</Text>
                        <Text style={{ color: '#8A94A6', fontSize: 12 }}>{item.subtitle}</Text>
                      </View>
                      <Text style={{ color: '#98A2B3', fontSize: 22, transform: [{ rotate: isOpen ? '45deg' : '0deg' }] }}>＋</Text>
                    </Pressable>
                    {isOpen ? (
                      <View style={{ paddingHorizontal: 17, paddingBottom: 17, gap: 11 }}>
                        {item.steps.map((step, index) => (
                          <View key={step} style={{ flexDirection: 'row', gap: 10 }}>
                            <Text style={{ color: item.color, fontSize: 13, fontWeight: '800' }}>{index + 1}</Text>
                            <Text style={{ flex: 1, color: '#596579', fontSize: 13, lineHeight: 20 }}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={{ padding: 18, gap: 14, borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#171D2D' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>緊急聯絡</Text>
              <Text style={{ color: '#AEB7C8', fontSize: 13, lineHeight: 19 }}>颱風期間如需協助，請依情況聯絡警察或消防救護。</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable accessibilityRole="button" accessibilityLabel="撥打 110 報警" onPress={() => void Linking.openURL('tel:110')} style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: pressed ? '#2563EB' : '#3182F6' })}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>110 警察</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="撥打 119 消防救護" onPress={() => void Linking.openURL('tel:119')} style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: pressed ? '#31394C' : '#273044' })}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>119 消防救護</Text>
                </Pressable>
              </View>
            </View>

            <Text style={{ textAlign: 'center', color: '#98A2B3', fontSize: 11, lineHeight: 17 }}>實際情況請以現場警消與政府發布的指示為準</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}