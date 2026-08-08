import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WeatherIcon } from '@/components/weather-icon';
import type { AppData } from '@/types/weather';

export function AqiDrawer({ open, data, onClose }: { open: boolean; data: AppData; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) setRendered(true);
    const animation = Animated.timing(progress, { toValue: open ? 1 : 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished && !open) setRendered(false); });
    return () => animation.stop();
  }, [open, progress]);
  if (!rendered) return null;

  const measurements = [
    ['PM2.5 細懸浮微粒', data.aqi.pm25, 'μg/m³'],
    ['PM10 懸浮微粒', data.aqi.pm10, 'μg/m³'],
    ['O3 臭氧', data.aqi.o3, 'ppb'],
    ['NO2 二氧化氮', data.aqi.no2, 'ppb'],
  ] as const;

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.40)', opacity: progress }}>
        <Pressable accessibilityLabel="關閉空氣品質資訊" onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderCurve: 'continuous', boxShadow: '0 -10px 30px rgba(0,0,0,0.16)', transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }}>
        <View style={{ padding: 24, paddingBottom: Math.max(insets.bottom, 32) }}>
          <View style={{ width: 40, height: 6, alignSelf: 'center', marginBottom: 20, borderRadius: 999, backgroundColor: '#E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: '#1E293B', fontSize: 18, fontWeight: '700' }}>空氣品質詳細資訊</Text>
            <Pressable onPress={onClose} style={({ pressed }) => ({ padding: 6, borderRadius: 999, backgroundColor: '#F8FAFC', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <WeatherIcon name="x" size={18} color="#94A3B8" />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <Text style={{ color: '#22C55E', fontSize: 48, lineHeight: 48, fontWeight: '600', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{data.aqi.value}</Text>
            <View style={{ paddingBottom: 4 }}><Text style={{ color: '#16A34A', fontSize: 15, fontWeight: '500' }}>{data.aqi.status}</Text><Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>AQI 指數</Text></View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 24, marginBottom: 32 }}>
            {measurements.map(([label, value, unit]) => (
              <View key={label} style={{ width: '50%', paddingRight: 8 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>{label}</Text>
                <Text style={{ color: '#334155', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{value} <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '400' }}>{unit}</Text></Text>
              </View>
            ))}
          </View>
          <View style={{ alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F8FAFC' }}><View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#4ADE80' }} /><Text style={{ color: '#64748B', fontSize: 10, fontWeight: '500' }}>{data.location.updateTime} 更新</Text></View></View>
        </View>
      </Animated.View>
    </View>
  );
}
