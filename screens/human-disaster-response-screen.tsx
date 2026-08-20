import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';

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
    id: 'attack', title: '暴力攻擊或槍擊', subtitle: '逃離、躲藏、通報', color: '#DC2626', background: '#FEF2F2',
    steps: ['能安全離開時，立刻沿反方向逃離，不停留拍攝。', '無法逃離時鎖門、關燈、靜音，遠離門窗並躲在堅固掩體後。', '確認安全後撥打 110，說明地點、嫌疑人特徵與傷者人數。'],
  },
  {
    id: 'explosion', title: '爆炸或建物倒塌', subtitle: '避開二次危害', color: '#EA580C', background: '#FFF7ED',
    steps: ['伏低並保護頭頸，避開玻璃、招牌與可能掉落的物品。', '依安全指示撤離，勿使用電梯；留意火災、瓦斯與結構崩塌。', '若受困，以簡訊或敲擊管線求救，避免揚起粉塵及大聲呼喊。'],
  },
  {
    id: 'suspicious', title: '可疑物品或包裹', subtitle: '不碰觸、不移動', color: '#7C3AED', background: '#F5F3FF',
    steps: ['不要觸碰、開啟、搖晃或使用手機近距離拍攝。', '讓周圍人員遠離，記住外觀與位置，避免使用無線電設備。', '移至安全距離後撥打 110，依警方指示行動。'],
  },
  {
    id: 'chemical', title: '有毒氣體或化學物質', subtitle: '逆風、遮蔽、除污', color: '#0F766E', background: '#F0FDFA',
    steps: ['立即往上風處或與風向垂直方向離開，避免低窪與密閉空間。', '以衣物遮住口鼻；進入室內後關閉門窗與空調換氣。', '疑似沾染時脫去外層衣物並以大量清水沖洗，等待專業救援。'],
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

const firstResponseUnits: FirstResponseUnit[] = [
  {
    id: 'leave', number: '01', title: '離開危險', summary: '先往安全的方向離開', color: '#DC2626', background: '#FEF2F2',
    intro: '看到危險，先往安全的地方離開。',
    paragraphs: ['如果突然看到有人攻擊別人、發生爆炸、車輛衝向人群，或很多人開始驚慌逃跑，請先注意危險在哪裡，往安全的方向離開。'],
    bulletLabel: '這時候記得：',
    bullets: [
      { text: '不要靠近危險' },
      { text: '不要停下來看熱鬧' },
      { text: '不要拍照或錄影' },
      { text: '不要為了拿東西跑回去' },
      { text: '找安全的出口或其他離開方向' },
      { text: '到安全的地方後，不要急著回到現場' },
    ],
    closing: '如果你還不知道發生什麼事，也不用靠近確認。\n\n先離開危險，再了解發生了什麼。',
  },
  {
    id: 'warn', number: '02', title: '警示周遭', summary: '提醒身邊的人一起離開', color: '#7C3AED', background: '#F5F3FF',
    intro: '自己準備離開時，也可以提醒身邊的人。',
    paragraphs: ['如果附近的人還沒有發現危險，可以簡單告訴他們：'],
    quotes: ['「前面有危險，不要過去！」', '「快離開這裡！」', '「往這邊走！」'],
    bulletLabel: '提醒大家時記得：',
    bullets: [
      { text: '說話簡單、清楚' },
      { text: '告訴大家危險在哪裡' },
      { text: '知道安全方向時，可以提醒大家往哪裡走' },
      { text: '不要為了提醒別人而跑回危險的地方' },
      { text: '不要傳播自己也不知道真假的消息' },
    ],
    closing: '如果身邊有小朋友、長輩或需要幫忙的人，而且自己是安全的，可以一起帶他們離開。\n\n先保護好自己，才有辦法幫助別人。',
  },
  {
    id: 'call', number: '03', title: '通報求援', summary: '安全後再打 110 或 119', color: '#2563EB', background: '#EFF6FF',
    intro: '到了安全的地方，再打電話求助。',
    paragraphs: ['看到有人攻擊別人、持有武器，或有其他危險情況：撥打 110 找警察。', '如果有人受傷、昏倒、受困、發生火災或需要救護：撥打 119 找消防救護。'],
    bulletLabel: '打電話時，可以告訴接線人員：',
    bullets: [
      { label: '在哪裡？', text: '發生事情的地點' },
      { label: '怎麼了？', text: '你看到發生什麼事' },
      { label: '危險在哪裡？', text: '危險人物、車輛或物品的位置' },
      { label: '長什麼樣子？', text: '把你真的看到的特徵說出來' },
      { label: '有人受傷嗎？', text: '知道多少就說多少' },
      { text: '如果有些事情不知道，直接說「不知道」就可以。' },
    ],
    closing: '不要為了看得更清楚，又跑回危險的地方。',
  },
];

function ArrowLeftIcon() {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function HumanDisasterResponseScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState('attack');
  const [firstExpanded, setFirstExpanded] = useState('leave');

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F7FA' }}>
      <StatusBar style="light" backgroundColor="#151B2B" />
      <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" style={{ backgroundColor: '#151B2B' }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24, backgroundColor: '#F6F7FA' }}>
        <View style={{ height: 420, overflow: 'hidden', backgroundColor: '#151B2B' }}>
          <Image
            source={{ uri: 'https://pub-8a5f0a3f447d4f1abfb165da80249e6b.r2.dev/DP-image/%E4%BA%BA%E7%82%BA%E7%81%BD%E5%AE%B3%E6%87%89%E8%AE%8A%E5%B0%81%E9%9D%A2%E5%9C%96%20(3).png' }}
            contentFit="cover"
            style={{ position: 'absolute', inset: 0 }}
          />
          <LinearGradient colors={['rgba(9,13,24,0.02)', 'rgba(9,13,24,0.16)', '#111725']} locations={[0, 0.48, 1]} style={{ position: 'absolute', inset: 0 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="返回防災指南" onPress={onBack} hitSlop={8} style={({ pressed }) => ({ position: 'absolute', top: Math.max(insets.top, 14) + 4, left: 18, width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' })}>
            <ArrowLeftIcon />
          </Pressable>
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: 25, gap: 10 }}>
            <View style={{ alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(132,92,246,0.88)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>SAFETY GUIDE</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 32, lineHeight: 38, fontWeight: '800' }}>人為災害應變</Text>
            <Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 14, lineHeight: 21 }}>保持冷靜、遠離危險，先確保自身安全再協助他人</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 22, gap: 22 }}>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#172033', fontSize: 20, fontWeight: '800' }}>第一時間這樣做</Text>
              <Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '700' }}>安全優先</Text>
            </View>
            <Text style={{ color: '#667085', fontSize: 13, lineHeight: 20 }}>
              危險發生時，你可能還不知道發生了什麼事。沒關係，這時候最重要的不是留下來看清楚，而是先保護自己、離開危險，再找人幫忙。
            </Text>
            <View style={{ gap: 6 }}>
              <Text style={{ color: '#172033', fontSize: 14, fontWeight: '800' }}>記住三件事</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1EDFF' }}>
                  <Text style={{ color: '#6D4AFF', fontSize: 13, fontWeight: '800' }}>先離開</Text>
                </View>
                <Text style={{ color: '#C4C9D4', fontSize: 14, fontWeight: '700' }}>→</Text>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1EDFF' }}>
                  <Text style={{ color: '#6D4AFF', fontSize: 13, fontWeight: '800' }}>提醒別人</Text>
                </View>
                <Text style={{ color: '#C4C9D4', fontSize: 14, fontWeight: '700' }}>→</Text>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1EDFF' }}>
                  <Text style={{ color: '#6D4AFF', fontSize: 13, fontWeight: '800' }}>安全後求助</Text>
                </View>
              </View>
            </View>
            {firstResponseUnits.map((item) => {
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
            <Text style={{ color: '#AEB7C8', fontSize: 13, lineHeight: 19 }}>請先移至安全位置，再依事件性質聯絡警察或消防救護。</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="撥打 110 報警" onPress={() => void Linking.openURL('tel:110')} style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: pressed ? '#6940E8' : '#7C5CFC' })}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>110 警察</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="撥打 119 消防救護" onPress={() => void Linking.openURL('tel:119')} style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: pressed ? '#31394C' : '#273044' })}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>119 消防救護</Text>
              </Pressable>
            </View>
          </View>

          <Text style={{ textAlign: 'center', color: '#98A2B3', fontSize: 11, lineHeight: 17 }}>實際情況請以現場警消與政府發布的指示為準</Text>
        </View>
      </ScrollView>
    </View>
  );
}
