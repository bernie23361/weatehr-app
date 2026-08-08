import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { WeatherIcon } from '@/components/weather-icon';
import type { AppTab, WeatherIconName } from '@/types/weather';

const tabs: { id: AppTab; icon: WeatherIconName; label: string }[] = [
  { id: 'weather', icon: 'sun', label: '天氣' },
  { id: 'observe', icon: 'eye', label: '觀測' },
  { id: 'warning', icon: 'megaphone', label: '預警' },
  { id: 'profile', icon: 'user', label: '專欄' },
];

export function BottomNavigation({ activeTab, onChange }: { activeTab: AppTab; onChange: (tab: AppTab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 8, paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: 8, backgroundColor: '#FFFFFF', boxShadow: '0 -10px 20px rgba(0,0,0,0.02)', zIndex: 20 }}>
      {tabs.map((item) => <BottomTabItem key={item.id} item={item} active={activeTab === item.id} onPress={() => onChange(item.id)} />)}
    </View>
  );
}

function BottomTabItem({ item, active, onPress }: { item: (typeof tabs)[number]; active: boolean; onPress: () => void }) {
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    Animated.sequence([
      Animated.timing(translateY, { toValue: -5, duration: 100, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [active, translateY]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ minWidth: 64, alignItems: 'center', gap: 4, padding: 8, borderRadius: 12, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {active ? <GradientNavIcon name={item.icon} /> : <WeatherIcon name={item.icon} size={22} strokeWidth={2.5} color="#94A3B8" />}
      </Animated.View>
      <Text style={{ color: active ? '#0057D9' : '#94A3B8', fontSize: 10, fontWeight: '500' }}>{item.label}</Text>
    </Pressable>
  );
}

function GradientNavIcon({ name }: { name: WeatherIconName }) {
  const gradientId = `bottom-nav-${name}`;
  const stroke = `url(#${gradientId})`;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Defs>
        <SvgLinearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2096FF" />
          <Stop offset="1" stopColor="#0057D9" />
        </SvgLinearGradient>
      </Defs>
      {name === 'sun' ? <>
        <Circle cx="12" cy="12" r="4" />
        <Path d="M12 2v2" />
        <Path d="M12 20v2" />
        <Path d="m4.93 4.93 1.41 1.41" />
        <Path d="m17.66 17.66 1.41 1.41" />
        <Path d="M2 12h2" />
        <Path d="M20 12h2" />
        <Path d="m6.34 17.66-1.41 1.41" />
        <Path d="m19.07 4.93-1.41 1.41" />
      </> : null}
      {name === 'eye' ? <><Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><Circle cx="12" cy="12" r="3" /></> : null}
      {name === 'megaphone' ? <><Path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /><Path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8" /></> : null}
      {name === 'user' ? <><Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><Circle cx="12" cy="7" r="4" /></> : null}
    </Svg>
  );
}
