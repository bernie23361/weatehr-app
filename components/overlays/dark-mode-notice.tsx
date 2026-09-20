import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const paragraphs = [
  '提醒您！深色模式雖然可以降低畫面亮度，在低光源環境中觀看時較不刺眼。',
  '但在過暗或全黑環境下長時間使用手機，仍可能因螢幕與周圍光線落差、長時間近距離觀看而造成眼睛疲勞、乾澀或不適。',
  '建議此模式仍需在有柔和環境光的地方使用，並記得適時休息。',
  '天氣概況 Weather 會盡量維持警示色、地圖圖層與重要資訊，提供您清楚可辨。',
];

export function DarkModeNotice({ visible, reducedMotion, onCancel, onConfirm }: {
  visible: boolean; reducedMotion: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onCancel}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, backgroundColor: 'rgba(15,23,42,0.48)' }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 390, maxHeight: '100%', borderRadius: 24, borderCurve: 'continuous', padding: 24, gap: 20, backgroundColor: '#FFFFFF', boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
        <Text accessibilityRole="header" style={{ fontSize: 21, fontWeight: '700', color: '#0F172A' }}>深色模式使用提醒</Text>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }}>
          {paragraphs.map((paragraph) => <Text key={paragraph} selectable style={{ fontSize: 15, lineHeight: 25, color: '#475569' }}>{paragraph}</Text>)}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => ({ flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: pressed ? '#E2E8F0' : '#F1F5F9' })}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#475569' }}>取消切換</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onConfirm} style={({ pressed }) => ({ flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: pressed ? '#1D4ED8' : '#2563EB' })}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>確定切換</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
