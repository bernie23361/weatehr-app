import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const EARTHQUAKE_COVER_IMAGE_URI = 'https://pub-8a5f0a3f447d4f1abfb165da80249e6b.r2.dev/DP-image/%E3%80%90%E6%BC%94%E7%B7%B4%E6%8A%97%E9%9C%87%E4%BF%9D%E5%91%BD%E4%B8%89%E6%AD%A5%E9%A9%9F%E3%80%91.jpg';

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
    id: 'indoor', title: '在室內', subtitle: '趴下、掩護、穩住', color: '#F59E0B', background: '#FFF8E6',
    steps: ['立刻趴下並躲在堅固桌子下，抓穩桌腳，保護頭頸。', '遠離窗戶、吊燈、玻璃與大型家具，不要急著衝出戶外。', '搖晃停止後檢查逃生路線與火源，關閉瓦斯、電源再離開。'],
  },
  {
    id: 'outdoor', title: '在室外', subtitle: '遠離建築物與掉落物', color: '#EA580C', background: '#FFF7ED',
    steps: ['遠離建築物、電線桿、招牌與樹木，到空曠處蹲低。', '保護頭部，等到搖晃停止，留意高處掉落的招牌與玻璃。', '確認周邊環境安全後再移動，避開龜裂地面與倒塌物。'],
  },
  {
    id: 'driving', title: '行車中', subtitle: '靠邊停、留在車內', color: '#2563EB', background: '#EFF6FF',
    steps: ['慢慢靠邊停車，避開橋梁、隧道、高架路段與電線桿。', '拉手煞車並開啟危險警示燈，留在車內直到搖晃停止。', '確認路面與上方結構安全後再下車，隨時留意餘震。'],
  },
  {
    id: 'sleeping', title: '睡覺時', subtitle: '留在床上、護住頭部', color: '#7C3AED', background: '#F5F3FF',
    steps: ['留在床上，用枕頭或棉被保護頭頸，不要急著起身。', '避開吊燈、吊扇與可能掉落的天花板物品。', '搖晃停止後先觀察周遭再起身，穿鞋移動避免踩到碎玻璃。'],
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
    intro: '我們位於環太平洋地震帶上，地震活動相當的頻繁，而此時此刻就有可能正在發生。\n\n雖然我們無法阻止地震發生，但可以先做好準備。平時就應該先固定好容易倒下的家具、準備防災用品、知道家裡哪裡比較安全，並和家人一起練習地震來時該怎麼做，這些都能在真正遇到強烈的地震時讓你少一點慌張。',
    flow: ['準備', '固定', '約定'],
    units: [
      {
        id: 'pack', number: '01', title: '準備防災包', summary: '隨手可取、全家都知道', color: '#F59E0B', background: '#FFF8E6',
        intro: '準備一個隨手可取的防災包，讓家人在緊急時刻不慌張。',
        paragraphs: ['防災包要放在門口或固定位置，全家人都知道放在哪裡。'],
        bulletLabel: '準備這些物品：',
        bullets: [
          { text: '水與乾糧（每人至少 3 天份）' },
          { text: '手電筒、電池、行動電源與收音機' },
          { text: '急救用品、常用藥品與身分證件影本' },
          { text: '現金、保暖衣物與輕便雨具' },
          { text: '行動不便者準備輔具與藥物，寵物準備飼料與水' },
        ],
        closing: '每半年檢查一次，更換過期品並依季節調整內容。',
      },
      {
        id: 'secure', number: '02', title: '固定環境', summary: '減少掉落與傾倒的危險', color: '#EA580C', background: '#FFF7ED',
        intro: '減少家中可能掉落或傾倒的危險，是災前最重要的準備。',
        bulletLabel: '檢查項目：',
        bullets: [
          { text: '固定大型家具與家電，避免地震時傾倒' },
          { text: '高處不放重物，易碎品收進有門的櫃子' },
          { text: '學習關閉瓦斯總開關，檢查管線與熱水器' },
          { text: '確認逃生路線與滅火器、緊急照明位置' },
        ],
        closing: '環境越穩固，搖晃時越安全。',
      },
      {
        id: 'plan', number: '03', title: '約定應變', summary: '先約好集合點與聯絡方式', color: '#DC2626', background: '#FEF2F2',
        intro: '與家人事先約定，災害發生時才知道該往哪裡集合、如何聯絡。',
        bulletLabel: '一起做好：',
        bullets: [
          { text: '約定災後集合點與緊急聯絡方式' },
          { text: '記下住家附近的避難場所位置與路線' },
          { text: '熟悉社區與大樓的防災編組與廣播指示' },
          { text: '教孩子辨識警報與基本的避難方法' },
        ],
        closing: '事先說好，慌亂時才不會失散。',
      },
    ],
  },
  {
    id: 'during', title: '災時應變',
    intro: '地震發生時，你只有短短幾秒可以反應。搖晃的瞬間不要急著跑，先保護自己，等搖晃停止再決定下一步。',
    flow: ['趴下', '掩護', '穩住'],
    units: [
      {
        id: 'drop', number: '01', title: '趴下', summary: '蹲低趴下，保護頭頸', color: '#F59E0B', background: '#FFF8E6',
        intro: '地震搖晃時，立刻蹲低或趴下，降低被掉落物砸中與跌倒的風險。',
        paragraphs: ['地震來襲只有短短幾秒，不要急著往外跑；雙手雙膝著地趴下，重心放低，保護頭頸與軀幹。'],
        bulletLabel: '記住：',
        bullets: [
          { text: '立刻蹲低或趴下，不要站立' },
          { text: '不要往門口或戶外跑，受傷常發生在移動途中' },
          { text: '不要使用電梯，搖晃時電梯可能故障或卡住' },
          { text: '在輪椅上先鎖住輪子，在床上則留在床上護住頭部' },
        ],
        closing: '先趴下，讓自己待在低處，是搖晃當下最重要的一步。',
      },
      {
        id: 'cover', number: '02', title: '掩護', summary: '躲到堅固桌下或內牆邊', color: '#EA580C', background: '#FFF7ED',
        intro: '趴下後，立刻尋找堅固的桌子底下或內牆角落掩蔽。',
        paragraphs: ['用一手護住頭頸，另一手抓穩掩體；如果沒有桌子，就靠在內牆角落蹲低，保持低於家具的高度。'],
        bulletLabel: '記住：',
        bullets: [
          { text: '優先躲在堅固桌子下，抓穩桌腳' },
          { text: '沒有桌子時，靠近內牆蹲低，保護頭頸' },
          { text: '遠離玻璃窗、吊燈、大型家具與高處物品' },
          { text: '不要站在門框下，老舊建築的門框並非可靠的保護' },
        ],
        closing: '掩護的位置要能擋住掉落物，並為你保留緩衝空間。',
      },
      {
        id: 'hold', number: '03', title: '穩住', summary: '抓穩掩體直到搖晃停止', color: '#DC2626', background: '#FEF2F2',
        intro: '保護好自己後，抓穩掩體，等地震搖晃完全停止。',
        paragraphs: ['搖晃可能持續數十秒，不要因為害怕就衝出去；確定停止後，再小心觀察環境。'],
        bulletLabel: '搖晃停止後記得：',
        bullets: [
          { text: '先確認自己與身邊的人是否受傷' },
          { text: '檢查瓦斯、火源與電線，聞到瓦斯味先關閉並遠離' },
          { text: '確認逃生路線暢通後再離開，不要使用電梯' },
          { text: '準備迎接餘震，持續待在安全處保持警覺' },
        ],
        closing: '地震結束不代表危險結束，餘震可能接著來，保持警覺直到狀況明朗。',
      },
    ],
  },
  {
    id: 'after', title: '災後處置',
    intro: '搖晃停止後，先確認自己與家人的狀況，再檢查環境危險，最後才決定是否撤離。',
    flow: ['檢查', '關閉', '撤離'],
    units: [
      {
        id: 'triage', number: '01', title: '檢查傷勢', summary: '先確認傷勢再協助他人', color: '#DC2626', background: '#FEF2F2',
        intro: '先確認自己是否受傷，再協助家人與鄰居。',
        bulletLabel: '處理重點：',
        bullets: [
          { text: '輕微外傷用乾淨布料加壓止血' },
          { text: '傷勢嚴重或受困時撥打 119，可用簡訊或敲擊管線求救' },
          { text: '不要移動疑似骨折或脊椎受傷的人，等待專業救援' },
          { text: '確認安危後再行動，避免慌亂奔跑' },
        ],
        closing: '先救急，再依嚴重程度求援。',
      },
      {
        id: 'shutoff', number: '02', title: '關閉火源', summary: '避免火災二次災害', color: '#F59E0B', background: '#FFF8E6',
        intro: '地震後最大的威脅常是火災，搖晃停止後優先處理火源。',
        bulletLabel: '檢查重點：',
        bullets: [
          { text: '聞到瓦斯味先關閉總開關，並遠離現場' },
          { text: '不要開關電器或使用明火，避免火花引燃' },
          { text: '確認沒有火災後再開燈或使用電器' },
          { text: '若已起火且能安全撲滅，使用滅火器處理' },
        ],
        closing: '關閉火源，才能避免二次災害。',
      },
      {
        id: 'evacuate', number: '03', title: '安全撤離', summary: '確認安全後再離開', color: '#EA580C', background: '#FFF7ED',
        intro: '確認環境安全、逃生路線暢通後，再決定是否撤離。',
        bulletLabel: '撤離時記得：',
        bullets: [
          { text: '穿上鞋子，避免踩到碎玻璃與尖銳物' },
          { text: '不要使用電梯，走樓梯並靠牆行進' },
          { text: '前往約定的集合點或避難場所' },
          { text: '隨時準備應付餘震，遠離受損建築' },
        ],
        closing: '撤離要從容有序，餘震期間持續保持警覺。',
      },
    ],
  },
];

function ArrowLeftIcon() {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function EarthquakeHeroScene() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 430 420" preserveAspectRatio="xMidYMid slice">
      <Rect width="430" height="420" fill="#151B2B" />
      <Circle cx="330" cy="96" r="120" fill="#7C3AED" opacity={0.4} />
      <Circle cx="70" cy="150" r="150" fill="#C2410C" opacity={0.34} />
      <Path d="M0 300h430v120H0z" fill="#0B1020" />
      <Path d="M0 300l52-20v140H0V300zm70-30h58v170H70V270zm74 48h74v152h-74V318zm90-96h92v230h-92V222zm110 44h86v186h-86V266z" fill="#0E1424" />
      <Path d="M292 230c-6 8-6 20 0 28M244 336c5-7 5-18 0-25" stroke="#F7C96B" strokeWidth={2} fill="none" opacity={0.7} />
      <Path d="M60 300c16 6 34-4 44-14 12-12 30-14 44-6 14 8 30 8 44 0 14-8 32-8 46 0 12 7 26 10 40 6 16-4 34 0 48 10l104 24v0H60z" fill="#11182A" opacity={0.95} />
      <Path d="M0 316l60 12 74-8 76 14 90-10 130 18v8H0z" fill="#7C3AED" opacity={0.28} />
      <Circle cx="326" cy="122" r="26" fill="#F59E0B" opacity={0.2} />
      <Circle cx="326" cy="122" r="10" fill="#FDBA74" opacity={0.85} />
    </Svg>
  );
}

export function EarthquakeResponseScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState('indoor');
  const [activePhase, setActivePhase] = useState<Phase['id']>('prepare');
  const [phaseMenuOpen, setPhaseMenuOpen] = useState(false);
  const [firstExpanded, setFirstExpanded] = useState('pack');
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
          {EARTHQUAKE_COVER_IMAGE_URI ? (
            <Image
              source={{ uri: EARTHQUAKE_COVER_IMAGE_URI }}
              contentFit="cover"
              style={{ position: 'absolute', inset: 0 }}
            />
          ) : (
            <EarthquakeHeroScene />
          )}
          <LinearGradient colors={['rgba(9,13,24,0.02)', 'rgba(9,13,24,0.16)', '#111725']} locations={[0, 0.48, 1]} style={{ position: 'absolute', inset: 0 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="返回防災指南" onPress={onBack} hitSlop={8} style={({ pressed }) => ({ position: 'absolute', top: Math.max(insets.top, 14) + 4, left: 18, width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' })}>
            <ArrowLeftIcon />
          </Pressable>
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: 25, gap: 10 }}>
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.9)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>SAFETY GUIDE</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 32, lineHeight: 38, fontWeight: '800' }}>地震應變</Text>
            <Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 14, lineHeight: 21 }}>趴下、掩護、穩住，先保護好自己再應變</Text>
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
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: pressed ? '#FFF3DB' : '#FFF8E6', borderWidth: 1, borderColor: '#FDE68A' })}
                >
                  <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '800' }}>{currentPhase.title}</Text>
                  <Text style={{ color: '#D97706', fontSize: 10, transform: [{ rotate: phaseMenuOpen ? '180deg' : '0deg' }] }}>▼</Text>
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
                        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 13, backgroundColor: pressed ? '#F8FAFC' : selected ? '#FFF8E6' : '#FFFFFF' })}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selected ? '#F59E0B' : '#E2E8F0' }} />
                        <Text style={{ color: selected ? '#D97706' : '#334155', fontSize: 14, fontWeight: selected ? '800' : '600' }}>{option.title}</Text>
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
                    <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFF3DB' }}>
                      <Text style={{ color: '#D97706', fontSize: 13, fontWeight: '800' }}>{step}</Text>
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
            <Text style={{ color: '#AEB7C8', fontSize: 13, lineHeight: 19 }}>地震後如需協助，請依情況聯絡警察或消防救護。</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="撥打 110 報警" onPress={() => void Linking.openURL('tel:110')} style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: pressed ? '#D97706' : '#F59E0B' })}>
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