import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WeatherIcon } from '@/components/weather-icon';

interface TopHeaderProps {
  title: string;
  onOpenMap: () => void;
  onOpenSidebar: () => void;
}

export function TopHeader({ title, onOpenMap, onOpenSidebar }: TopHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12), paddingBottom: 12, backgroundColor: '#FFFFFF', zIndex: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="開啟防災指南" onPress={onOpenMap} hitSlop={8} style={({ pressed }) => ({ padding: 8, marginLeft: -8, borderRadius: 999, backgroundColor: pressed ? '#F8FAFC' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
        <WeatherIcon name="map" size={22} color="#94A3B8" />
      </Pressable>
      <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '600' }}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="開啟縣市收藏" onPress={onOpenSidebar} hitSlop={8} style={({ pressed }) => ({ padding: 8, marginRight: -8, borderRadius: 999, backgroundColor: pressed ? '#F8FAFC' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
        <WeatherIcon name="menu" size={22} color="#94A3B8" />
      </Pressable>
    </View>
  );
}
