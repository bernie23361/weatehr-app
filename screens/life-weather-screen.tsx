import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { WeatherIcon } from '@/components/weather-icon';
import { cardShadow, subtleShadow } from '@/components/common';
import { lifeIndices as defaultLifeIndices } from '@/data/life-indices';
import { resolveDrivingDefenseIndex, type MotoDefenseInput } from '@/data/driving-defense-index';
import type { CurrentWeatherObservation } from '@/services/weather-api';
import type { VehicleType } from '@/services/app-settings';
import type { AppData, HourlyForecast, LifeIndex } from '@/types/weather';

interface LifeWeatherScreenProps {
  onBack: () => void;
  data: AppData;
  indices?: LifeIndex[];
  vehicle?: VehicleType;
  observation?: CurrentWeatherObservation | null;
  hourlyForecast?: HourlyForecast[];
}

const MOTO_ICON_PATH = 'M8.36547 10L11.2 8H14.6915L13.5996 5H11V3H15L16.0919 6H20V9H17.1838L18.6405 13.0022C21.0608 13.0764 23 15.0617 23 17.5C23 19.9853 20.9853 22 18.5 22C16.0147 22 14 19.9853 14 17.5C14 15.6722 15.0897 14.0989 16.6549 13.3944L15.4194 10H14.4718L12.89 15.87L9.96536 16.9389C9.98822 17.1227 10 17.31 10 17.5C10 19.9853 7.98528 22 5.5 22C3.01472 22 1 19.9853 1 17.5C1 15.5407 2.25221 13.8738 4 13.2561V12H2V10H8.36547ZM5.5 20C6.88071 20 8 18.8807 8 17.5C8 16.1193 6.88071 15 5.5 15C4.11929 15 3 16.1193 3 17.5C3 18.8807 4.11929 20 5.5 20ZM18.5 20C19.8807 20 21 18.8807 21 17.5C21 16.1193 19.8807 15 18.5 15C17.1193 15 16 16.1193 16 17.5C16 18.8807 17.1193 20 18.5 20Z';

const CAR_ICON_PATH = 'M19 20H5V21C5 21.5523 4.55228 22 4 22H3C2.44772 22 2 21.5523 2 21V12L4.51334 5.29775C4.80607 4.51715 5.55231 4 6.386 4H17.614C18.4477 4 19.1939 4.51715 19.4867 5.29775L22 12V21C22 21.5523 21.5523 22 21 22H20C19.4477 22 19 21.5523 19 21V20ZM4.136 12H19.864L17.614 6H6.386L4.136 12ZM6.5 17C7.32843 17 8 16.3284 8 15.5C8 14.6716 7.32843 14 6.5 14C5.67157 14 5 14.6716 5 15.5C5 16.3284 5.67157 17 6.5 17ZM17.5 17C18.3284 17 19 16.3284 19 15.5C19 14.6716 18.3284 14 17.5 14C16.6716 14 16 14.6716 16 15.5C16 16.3284 16.6716 17 17.5 17Z';

function MotorcycleIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={MOTO_ICON_PATH} />
    </Svg>
  );
}

function CarIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={CAR_ICON_PATH} />
    </Svg>
  );
}

function parsePercent(value?: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function numericString(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildMotoInput(data: AppData, observation: CurrentWeatherObservation | null | undefined, hourlyForecast: HourlyForecast[] | undefined): MotoDefenseInput {
  const rainIntensity = observation?.precipitationIntensity ?? null;
  const status = data.weather.status ?? '';
  const windSpeed = observation?.windSpeedMs ?? numericString(data.weather.windSpeed);
  const temp = observation?.temperature ?? numericString(data.weather.temp);
  const rainProb1h = parsePercent(hourlyForecast?.[1]?.pop ?? hourlyForecast?.[0]?.pop);
  return {
    rainIntensity,
    rainProb1h,
    windSpeed,
    visibilityKm: observation?.visibilityKm ?? null,
    aqi: data.aqi.value,
    temp,
    severeAdvisory: data.alerts.hasActiveAlarm && /颱風|豪雨|大豪雨|超大豪雨/.test(data.alerts.title),
    heavyRainNow: (rainIntensity != null && rainIntensity >= 5) || /大雨|豪雨|雷雨/.test(status),
  };
}

export function LifeWeatherScreen({ onBack, data, indices = defaultLifeIndices, vehicle = 'car', observation, hourlyForecast }: LifeWeatherScreenProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<LifeIndex | null>(null);

  const motoInput = useMemo(() => buildMotoInput(data, observation, hourlyForecast), [data, observation, hourlyForecast]);
  const defense = useMemo(() => resolveDrivingDefenseIndex(data, vehicle, vehicle === 'motorcycle' ? motoInput : undefined), [data, vehicle, motoInput]);
  const vehicleLabel = vehicle === 'motorcycle' ? '機車' : '汽車';

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F7F9' }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12), paddingBottom: 12, backgroundColor: '#FFFFFF' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回天氣首頁" onPress={onBack} hitSlop={8} style={({ pressed }) => ({ padding: 8, marginLeft: -8, borderRadius: 999, backgroundColor: pressed ? '#F8FAFC' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
          <ArrowLeft size={22} color="#1E293B" />
        </Pressable>
        <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '600' }}>生活天氣</Text>
        <View style={{ width: 38, height: 38, marginRight: -8 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 24) + 24, gap: 16 }}>
        <View style={{ padding: 20, borderRadius: 28, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: cardShadow, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ padding: 8, borderRadius: 14, backgroundColor: '#EFF6FF' }}>
                {vehicle === 'motorcycle' ? <MotorcycleIcon color="#2563EB" size={20} /> : <CarIcon color="#2563EB" size={20} />}
              </View>
              <View>
                <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '700' }}>{vehicleLabel}防禦指數</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>依目前天氣即時評估</Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: defense.levelBg }}>
              <Text style={{ color: defense.levelColor, fontSize: 13, fontWeight: '700' }}>{defense.levelLabel}</Text>
            </View>
          </View>

          {defense.dots == null ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 14 }}>
              <Text style={{ color: '#1E293B', fontSize: 48, fontWeight: '700', lineHeight: 50, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{defense.score}</Text>
              <Text style={{ color: '#94A3B8', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>/ 100</Text>
            </View>
          ) : null}

          {defense.dots != null ? (
            <View accessible accessibilityLabel={`風險等級 ${defense.levelLabel}，實心 ${defense.dots} 顆`} style={{ flexDirection: 'row', gap: 7, marginBottom: 14 }}>
              {[0, 1, 2, 3, 4].map((index) => {
                const filled = index < (defense.dots ?? 0);
                return <View key={index} style={{ width: 14, height: 14, borderRadius: 999, borderWidth: 1.5, borderColor: filled ? defense.levelColor : '#CBD5E1', backgroundColor: filled ? defense.levelColor : 'transparent' }} />;
              })}
            </View>
          ) : null}

          {defense.factors.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {defense.factors.map((factor) => {
                const tone = factor.tone === 'danger'
                  ? { bg: '#FEE2E2', text: '#DC2626' }
                  : factor.tone === 'watch'
                    ? { bg: '#FEF3C7', text: '#B45309' }
                    : { bg: '#DCFCE7', text: '#16A34A' };
                return <View key={factor.label} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tone.bg }}><Text style={{ color: tone.text, fontSize: 11, fontWeight: '700' }}>{factor.label}</Text></View>;
              })}
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            {defense.advice.map((line, index) => (
              <View key={`${line}-${index}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: defense.levelColor, marginTop: 7 }} />
                <Text style={{ flex: 1, color: '#334155', fontSize: 13, lineHeight: 20 }}>{line}</Text>
              </View>
            ))}
          </View>

          <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 14 }}>可至「設定 › 行車防禦」切換汽車或機車</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 3, height: 14, backgroundColor: '#0057D9', borderRadius: 999 }} />
          <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '600' }}>今日生活指數</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {indices.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.label}，${item.value}，${item.desc}`} onPress={() => setSelected(item)} style={({ pressed }) => ({ width: '47%', flexGrow: 1, padding: 14, borderRadius: 22, borderCurve: 'continuous', borderWidth: 1, borderColor: pressed ? '#DBEAFE' : '#F1F5F9', backgroundColor: '#FFFFFF', boxShadow: subtleShadow, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ padding: 7, borderRadius: 12, backgroundColor: item.iconBg }}>
                  <WeatherIcon name={item.icon} size={18} color={item.iconColor} />
                </View>
                <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '600' }}>{item.label}</Text>
              </View>
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: item.badgeBg, marginBottom: 8 }}>
                <Text style={{ color: item.badgeText, fontSize: 12, fontWeight: '700' }}>{item.value}</Text>
              </View>
              <Text style={{ color: '#334155', fontSize: 12, lineHeight: 18 }}>{item.desc}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 2 }}>生活指數依目前天氣建議 · 點擊卡片可查看細節</Text>
      </ScrollView>

      <Modal visible={selected != null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.35)', padding: 24 }}>
          {selected ? (
            <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 360, padding: 24, gap: 14, borderRadius: 24, backgroundColor: '#FFFFFF' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ padding: 10, borderRadius: 14, backgroundColor: selected.iconBg }}>
                  <WeatherIcon name={selected.icon} size={24} color={selected.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text accessibilityRole="header" style={{ color: '#1E293B', fontSize: 18, fontWeight: '600' }}>{selected.label}</Text>
                  <View style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999, backgroundColor: selected.badgeBg }}>
                    <Text style={{ color: selected.badgeText, fontSize: 11, fontWeight: '700' }}>{selected.value}</Text>
                  </View>
                </View>
              </View>
              <Text style={{ color: '#334155', fontSize: 14, lineHeight: 22 }}>{selected.desc}</Text>
              {selected.tips ? <Text style={{ color: '#64748B', fontSize: 13, lineHeight: 21 }}>{selected.tips}</Text> : null}
              <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={({ pressed }) => ({ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ color: '#0057D9', fontSize: 14, fontWeight: '600' }}>知道了</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}