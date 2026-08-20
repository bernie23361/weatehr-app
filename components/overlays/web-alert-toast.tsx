import { Platform, Pressable, Text, View } from 'react-native';
import type { AppData } from '@/types/weather';
import { WeatherIcon } from '@/components/weather-icon';

export function WebAlertToast({ alert, visible, onPress, onClose }: {
  alert: AppData['alerts'];
  visible: boolean;
  onPress: () => void;
  onClose: () => void;
}) {
  if (Platform.OS !== 'web' || !visible) return null;

  return (
    <View accessibilityLiveRegion="assertive" style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 80, alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`開啟預警通知：${alert.title}`} onPress={onPress} style={({ pressed }) => ({ width: '100%', maxWidth: 398, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFFFFF', boxShadow: '0 12px 30px rgba(15,23,42,0.22)', opacity: pressed ? 0.9 : 1 })}>
        <WeatherIcon name="alert-triangle" size={22} color="#DC2626" />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: '#991B1B', fontSize: 14, fontWeight: '700' }}>{alert.title}</Text>
          <Text numberOfLines={2} style={{ marginTop: 3, color: '#475569', fontSize: 12, lineHeight: 17 }}>{alert.content}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="關閉預警通知" onPress={(event) => { event.stopPropagation(); onClose(); }} hitSlop={8} style={{ padding: 4 }}>
          <WeatherIcon name="x" size={17} color="#64748B" />
        </Pressable>
      </Pressable>
    </View>
  );
}
