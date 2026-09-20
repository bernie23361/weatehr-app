import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WeatherIcon } from '@/components/weather-icon';
import { getWeatherStatDetails, type WeatherStat } from '@/data/weather-stat-details';
import { resolveAqiStatus } from '@/data/aqi-status';
import type { AppData } from '@/types/weather';

export function AqiDrawer({ open, data, onClose, metric }: { open: boolean; data: AppData; onClose: () => void; metric?: WeatherStat }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const liveDotPulse = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) setRendered(true);
    const animation = Animated.timing(progress, { toValue: open ? 1 : 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished && !open) setRendered(false); });
    return () => animation.stop();
  }, [open, progress]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(liveDotPulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [liveDotPulse]);

  if (!rendered) return null;
  const aqiStatus = resolveAqiStatus(data.aqi.value, data.aqi.status);
  const stationName = data.aqi.stationName?.endsWith('站') ? data.aqi.stationName : `${data.aqi.stationName ?? '臺灣大道'}站`;

  const details = metric ? getWeatherStatDetails(metric, data) : undefined;
  const title = details ? `即時${details.title}` : '即時空氣品質';
  const color = details?.status.badgeText ?? aqiStatus.indicatorColor;
  const measurements = details?.measurements ?? [
    ['PM2.5 細懸浮微粒', data.aqi.pm25, 'μg/m³'],
    ['PM10 懸浮微粒', data.aqi.pm10, 'μg/m³'],
    ['O3 臭氧', data.aqi.o3, 'ppb'],
    ['NO2 二氧化氮', data.aqi.no2, 'ppb'],
  ] as const;

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.40)', opacity: progress }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`關閉${title}資訊`} onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderCurve: 'continuous', boxShadow: '0 -10px 30px rgba(0,0,0,0.16)', transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [520, 0] }) }] }}>
        <View style={{ padding: 24, paddingBottom: Math.max(insets.bottom, 32) }}>
          <View style={{ width: 40, height: 6, alignSelf: 'center', marginBottom: 20, borderRadius: 999, backgroundColor: '#E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: '#1E293B', fontSize: 18, fontWeight: '700' }}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`關閉${title}資訊`} onPress={onClose} style={({ pressed }) => ({ padding: 6, borderRadius: 999, backgroundColor: '#F8FAFC', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <WeatherIcon name="x" size={18} color="#94A3B8" />
            </Pressable>
          </View>
          <View style={{ marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              <Text style={{ color, fontSize: 48, lineHeight: 48, fontWeight: '600', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{details?.value ?? data.aqi.value}</Text>
              <View style={{ paddingBottom: 4 }}><Text style={{ color, fontSize: 15, fontWeight: '500' }}>{details?.status.label ?? aqiStatus.label}</Text><Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>{details?.unit ?? 'AQI 指數'}</Text></View>
            </View>
            <Text style={{ color: '#334155', fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 12 }}>{details?.phrase ?? aqiStatus.phrase}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 24, marginBottom: 32 }}>
            {measurements.map(([label, value, unit]) => (
              <View key={label} style={{ width: '50%', paddingRight: 8 }}>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>{label}</Text>
                <Text style={{ color: '#334155', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{value} <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '400' }}>{unit}</Text></Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#64748B', fontSize: 14, lineHeight: 20, fontWeight: '500' }}>{details ? `${data.location.city}${data.location.district}` : stationName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Animated.View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#4ADE80', opacity: liveDotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ scale: liveDotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.18] }) }] }} />
              <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '500' }}>{data.location.updateTime} 更新</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
