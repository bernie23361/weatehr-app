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

const COLUMN_ICON_PATH = 'M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM11 5H4V19H11V5ZM13 5V19H20V5H13ZM14 7H19V9H14V7ZM14 10H19V12H14V10Z';

const SUN_ICON_PATH = 'M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z';

const MEGAPHONE_ICON_PATH = 'M9 17C9 17 16 18 19 21H20C20.5523 21 21 20.5523 21 20V13.937C21.8626 13.715 22.5 12.9319 22.5 12C22.5 11.0681 21.8626 10.285 21 10.063V4C21 3.44772 20.5523 3 20 3H19C16 6 9 7 9 7H5C3.89543 7 3 7.89543 3 9V15C3 16.1046 3.89543 17 5 17H6L7 22H9V17ZM11 8.6612C11.6833 8.5146 12.5275 8.31193 13.4393 8.04373C15.1175 7.55014 17.25 6.77262 19 5.57458V18.4254C17.25 17.2274 15.1175 16.4499 13.4393 15.9563C12.5275 15.6881 11.6833 15.4854 11 15.3388V8.6612ZM5 9H9V15H5V9Z';

const EYE_ICON_PATH = 'M12.0003 3C17.3924 3 21.8784 6.87976 22.8189 12C21.8784 17.1202 17.3924 21 12.0003 21C6.60812 21 2.12215 17.1202 1.18164 12C2.12215 6.87976 6.60812 3 12.0003 3ZM12.0003 19C16.2359 19 19.8603 16.052 20.7777 12C19.8603 7.94803 16.2359 5 12.0003 5C7.7646 5 4.14022 7.94803 3.22278 12C4.14022 16.052 7.7646 19 12.0003 19ZM12.0003 16.5C9.51498 16.5 7.50026 14.4853 7.50026 12C7.50026 9.51472 9.51498 7.5 12.0003 7.5C14.4855 7.5 16.5003 9.51472 16.5003 12C16.5003 14.4853 14.4855 16.5 12.0003 16.5ZM12.0003 14.5C13.381 14.5 14.5003 13.3807 14.5003 12C14.5003 10.6193 13.381 9.5 12.0003 9.5C10.6196 9.5 9.50026 10.6193 9.50026 12C9.50026 13.3807 10.6196 14.5 12.0003 14.5Z';

function EyeIcon({ fill }: { fill: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={fill}>
      <Path d={EYE_ICON_PATH} />
    </Svg>
  );
}

function EyeGradientIcon() {
  const gradientId = 'bottom-nav-eye';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={`url(#${gradientId})`}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2096FF" />
          <Stop offset="1" stopColor="#0057D9" />
        </SvgLinearGradient>
      </Defs>
      <Path d={EYE_ICON_PATH} />
    </Svg>
  );
}

function SunIcon({ fill }: { fill: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={fill}>
      <Path d={SUN_ICON_PATH} />
    </Svg>
  );
}

function SunGradientIcon() {
  const gradientId = 'bottom-nav-sun';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={`url(#${gradientId})`}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2096FF" />
          <Stop offset="1" stopColor="#0057D9" />
        </SvgLinearGradient>
      </Defs>
      <Path d={SUN_ICON_PATH} />
    </Svg>
  );
}

function MegaphoneIcon({ fill }: { fill: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={fill}>
      <Path d={MEGAPHONE_ICON_PATH} />
    </Svg>
  );
}

function MegaphoneGradientIcon() {
  const gradientId = 'bottom-nav-megaphone';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={`url(#${gradientId})`}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2096FF" />
          <Stop offset="1" stopColor="#0057D9" />
        </SvgLinearGradient>
      </Defs>
      <Path d={MEGAPHONE_ICON_PATH} />
    </Svg>
  );
}

function ColumnIcon({ fill }: { fill: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={fill}>
      <Path d={COLUMN_ICON_PATH} />
    </Svg>
  );
}

function ColumnGradientIcon() {
  const gradientId = 'bottom-nav-column';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={`url(#${gradientId})`}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#2096FF" />
          <Stop offset="1" stopColor="#0057D9" />
        </SvgLinearGradient>
      </Defs>
      <Path d={COLUMN_ICON_PATH} />
    </Svg>
  );
}

export function BottomNavigation({ activeTab, onChange, dark = false }: { activeTab: AppTab; onChange: (tab: AppTab) => void; dark?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 8, paddingBottom: Math.max(insets.bottom, 24), paddingHorizontal: 8, backgroundColor: dark ? '#111827' : '#FFFFFF', boxShadow: '0 -10px 20px rgba(0,0,0,0.08)', zIndex: 20 }}>
      {tabs.map((item) => <BottomTabItem key={item.id} item={item} active={activeTab === item.id} onPress={() => onChange(item.id)} dark={dark} />)}
    </View>
  );
}

function BottomTabItem({ item, active, onPress, dark }: { item: (typeof tabs)[number]; active: boolean; onPress: () => void; dark: boolean }) {
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
        {item.id === 'profile' ? (
          active ? <ColumnGradientIcon /> : <ColumnIcon fill="#94A3B8" />
        ) : item.id === 'weather' ? (
          active ? <SunGradientIcon /> : <SunIcon fill="#94A3B8" />
        ) : item.id === 'warning' ? (
          active ? <MegaphoneGradientIcon /> : <MegaphoneIcon fill="#94A3B8" />
        ) : item.id === 'observe' ? (
          active ? <EyeGradientIcon /> : <EyeIcon fill="#94A3B8" />
        ) : active ? <GradientNavIcon name={item.icon} /> : <WeatherIcon name={item.icon} size={22} strokeWidth={2.5} color="#94A3B8" />}
      </Animated.View>
      <Text style={{ color: active ? (dark ? '#60A5FA' : '#0057D9') : '#94A3B8', fontSize: 10, fontWeight: '500' }}>{item.label}</Text>
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
