import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, AppState, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SectionCard, SectionHeading, StatCard, subtleShadow } from '@/components/common';
import { WeatherIcon } from '@/components/weather-icon';
import { resolveWeatherConditionIcon } from '@/data/weather-icon-mapping';
import { resolveAqiStatus } from '@/data/aqi-status';
import { selectLifeRecommendations } from '@/data/life-recommendations';
import { disasterWeatherCardGradientColors, normalWeatherCardGradientColors } from '@/data/weather-state-colors';
import { resolveFeelsLikeStatus, resolveHumidityStatus, resolveWindStatus } from '@/data/weather-stat-status';
import { WeatherScene } from '@/src/weather-scene/components/weather-scene';
import { resolveWeatherScene } from '@/src/weather-scene/engine/resolve-weather-scene';
import type { WeatherSceneInput } from '@/src/weather-scene/types';
import type { StatLabelTone } from '@/services/app-settings';
import type { AppData, HourlyForecast, LifeSuggestion, WeeklyForecast, WeeklyPeriod } from '@/types/weather';

import type { WeatherStat } from '@/data/weather-stat-details';

interface WeatherCardProps {
  data: AppData;
  isFavorite: boolean;
onToggleFavorite: () => void;
  onOpenAqi: () => void;
  onOpenWeatherStat: (metric: WeatherStat) => void;
  isDisasterVisualActive: boolean;
  sceneInput?: WeatherSceneInput;
  labelTone?: StatLabelTone;
}

const parseClockMinutes = (value: string) => {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const getCurrentClockMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getSolarProgress = (nowMinutes: number, sunrise: string, sunset: string) => {
  const sunriseMinutes = parseClockMinutes(sunrise);
  const sunsetMinutes = parseClockMinutes(sunset);
  if (sunriseMinutes == null || sunsetMinutes == null || sunsetMinutes <= sunriseMinutes) return 0.5;
  return clamp((nowMinutes - sunriseMinutes) / (sunsetMinutes - sunriseMinutes), 0, 1);
};

const getSolarArcPosition = (progress: number) => {
  const start = { x: 24, y: 146 };
  const control = { x: 160, y: 48 };
  const end = { x: 296, y: 146 };
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
    y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y,
  };
};


export const WeatherCard = memo(function WeatherCard({ data, isFavorite, onToggleFavorite, onOpenAqi, onOpenWeatherStat, isDisasterVisualActive, sceneInput, labelTone = 'standard' }: WeatherCardProps) {
  const [temperatureWidth, setTemperatureWidth] = useState(72);
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentClockMinutes);
  const liveDotPulse = useRef(new Animated.Value(0)).current;
  const weatherIconFloat = useRef(new Animated.Value(0)).current;
  const statusCharacters = [...data.weather.status];
  const estimatedCharacterWidth = 14;
  const comfortableGap = 8;
  const naturalStatusWidth = statusCharacters.length * estimatedCharacterWidth;
  const comfortableStatusWidth = naturalStatusWidth + Math.max(0, statusCharacters.length - 1) * comfortableGap;
  const statusWidth = Math.max(naturalStatusWidth, Math.min(temperatureWidth, comfortableStatusWidth));
const statusOffset = (temperatureWidth - statusWidth) / 2;
  const feelsLikeStatus = resolveFeelsLikeStatus(data.weather.feelsLike, labelTone);
  const humidityStatus = resolveHumidityStatus(data.weather.humidity, labelTone);
  const windStatus = resolveWindStatus(data.weather.windSpeed, labelTone);
  const aqiStatus = resolveAqiStatus(data.aqi.value, data.aqi.status);
  const stateGradientColors = isDisasterVisualActive ? disasterWeatherCardGradientColors : normalWeatherCardGradientColors;
  const scene = useMemo(() => sceneInput ? resolveWeatherScene(sceneInput) : undefined, [sceneInput]);
  const sunriseMinutes = parseClockMinutes(data.astro.sunrise);
  const sunsetMinutes = parseClockMinutes(data.astro.sunset);
  const isDaytime = sunriseMinutes != null && sunsetMinutes != null
    ? currentMinutes >= sunriseMinutes && currentMinutes < sunsetMinutes
    : currentMinutes >= 6 * 60 && currentMinutes < 18 * 60;
  const weatherIconPeriod = isDaytime ? 'day' : 'night';
  const conditionIcon = resolveWeatherConditionIcon(data.weather.status, weatherIconPeriod);
  const primaryText = scene?.surface.textPrimary ?? '#1E293B';
  const secondaryText = scene?.surface.textSecondary ?? '#64748B';

  useEffect(() => {
    const timer = setInterval(() => setCurrentMinutes(getCurrentClockMinutes()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const liveDotAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(liveDotPulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    const weatherIconAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(weatherIconFloat, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(weatherIconFloat, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
    );

    liveDotAnimation.start();
    weatherIconAnimation.start();

    return () => {
      liveDotAnimation.stop();
      weatherIconAnimation.stop();
    };
  }, [liveDotPulse, weatherIconFloat]);

  return (
    <View style={{ backgroundColor: scene?.surface.cardTint ?? '#FFFFFF', padding: 20, paddingBottom: 24, borderRadius: 28, borderCurve: 'continuous', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
      {scene ? <WeatherScene scene={scene} ambientColor={isDisasterVisualActive ? '#BB2233' : undefined} /> : <LinearGradient colors={stateGradientColors} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }} />}
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.90)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }} />
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <Text style={{ color: primaryText, fontSize: 18, fontWeight: '600', letterSpacing: 0.4 }}>
            {data.location.city}{data.location.district}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Animated.View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#4ADE80', opacity: liveDotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ scale: liveDotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.18] }) }] }} />
              <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '500' }}>{data.location.updateTime} 更新</Text>
            </View>
            <FavoriteButton isFavorite={isFavorite} onPress={onToggleFavorite} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text onLayout={(event) => setTemperatureWidth(event.nativeEvent.layout.width)} style={{ color: primaryText, fontSize: 60, fontWeight: '400', lineHeight: 60, letterSpacing: -3, fontVariant: ['tabular-nums'] }}>{data.weather.temp}</Text>
              <Text style={{ color: primaryText, fontSize: 28, fontWeight: '400', lineHeight: 30, marginLeft: 1, transform: [{ translateY: -2 }] }}>°</Text>
            </View>
            <View style={{ width: statusWidth, marginLeft: statusOffset, flexDirection: 'row', justifyContent: statusCharacters.length > 1 ? 'space-between' : 'center', marginTop: 4 }}>
              {statusCharacters.map((character, index) => (
                <Text key={`${character}-${index}`} style={{ color: secondaryText, fontSize: 14, fontWeight: '500' }}>{character}</Text>
              ))}
            </View>
          </View>
          <Animated.View style={{ transform: [{ translateY: weatherIconFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
            <View style={{ width: 96, height: 96, marginRight: 4, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: 16 },{scale:scene?.celestial.mode==='none'?1:(scene?.celestial.scale ?? 1)}],opacity:scene?.celestial.mode==='none'?1:(scene?.celestial.opacity ?? 1),filter:scene&&scene.celestial.mode!=='none'?[{brightness:scene.celestial.brightness},{saturate:scene.celestial.saturation}]:undefined,boxShadow:scene&&scene.celestial.glow>0?`0 0 ${Math.round(18+scene.celestial.glow*24)}px rgba(226,232,240,${scene.celestial.glow*.35})`:undefined }}>
            <WeatherIcon name={conditionIcon} size={124} accessibilityLabel={`${data.weather.status}天氣狀態`} style={{ width: 124, height: 106 }} />
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
        <StatCard accessibilityRole="button" accessibilityLabel="查看體感溫度資訊" onPress={() => onOpenWeatherStat('feelsLike')} label="體感溫度" value={data.weather.feelsLike} status={feelsLikeStatus.label} badgeBg={feelsLikeStatus.badgeBg} badgeText={feelsLikeStatus.badgeText} />
        <StatCard accessibilityRole="button" accessibilityLabel="查看相對濕度資訊" onPress={() => onOpenWeatherStat('humidity')} label="相對濕度" value={data.weather.humidity} status={humidityStatus.label} badgeBg={humidityStatus.badgeBg} badgeText={humidityStatus.badgeText} />
        <StatCard accessibilityRole="button" accessibilityLabel="查看平均風速資訊" onPress={() => onOpenWeatherStat('windSpeed')} label="平均風速" value={data.weather.windSpeed} status={windStatus.label} badgeBg={windStatus.badgeBg} badgeText={windStatus.badgeText} />
      </View>

      <Pressable onPress={onOpenAqi} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}>
        <AqiLeafIcon size={16} color="#22C55E" />
        <View style={{ flex: 1, height: 5 }}>
          <LinearGradient colors={['#4ADE80', '#FACC15', '#8B4513']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 5, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1' }} />
          <View style={{ position: 'absolute', left: `${aqiStatus.indicatorPercent}%`, top: '50%', width: 14, height: 14, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: aqiStatus.indicatorColor, transform: [{ translateX: -7 }, { translateY: -7 }], boxShadow: subtleShadow }} />
        </View>
        <Text style={{ color: aqiStatus.indicatorColor, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {data.aqi.value} <Text style={{ color: '#94A3B8', fontWeight: '400', fontSize: 10 }}>AQI</Text>
        </Text>
      </Pressable>
    </View>
  );
});

function SuggestionCard({ item }: { item: LifeSuggestion }) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 12, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFFFFF', boxShadow: subtleShadow }}>
      <View style={{ padding: 6, borderRadius: 12, backgroundColor: item.iconBg, marginBottom: 8 }}>
        <WeatherIcon name={item.icon} size={18} color={item.iconColor} />
      </View>
      <Text style={{ color: '#9CA3AF', fontSize: 10, marginBottom: 2 }}>{item.label}</Text>
      <Text style={{ color: '#374151', fontSize: 13, fontWeight: '600', marginBottom: 2 }}>{item.value}</Text>
      <Text style={{ color: '#9CA3AF', fontSize: 9, textAlign: 'center' }}>{item.desc}</Text>
    </View>
  );
}

export const LifeSuggestionsSection = memo(function LifeSuggestionsSection({ suggestions, data, onOpenLifeWeather }: { suggestions: LifeSuggestion[]; data: AppData; onOpenLifeWeather: () => void }) {
  const [now, setNow] = useState(() => new Date());
  const [contentWidth, setContentWidth] = useState(0);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 10 * 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const recommendations = useMemo(() => selectLifeRecommendations(data, suggestions, now), [data, suggestions, now]);
  const visibleSuggestions = recommendations.slice(0, contentWidth >= 360 ? 4 : 3);
  return (
    <SectionCard>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flexShrink: 1 }}><SectionHeading>現在適合做什麼</SectionHeading></View>
        <Pressable accessibilityRole="button" accessibilityLabel="查看更多生活天氣" onPress={onOpenLifeWeather} hitSlop={8} style={({ pressed }) => ({ minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: '#0057D9', fontSize: 12, fontWeight: '600' }}>查看更多 ›</Text>
        </Pressable>
      </View>
      <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap: 8 }}>
        {visibleSuggestions.map((item) => <SuggestionCard key={item.id} item={item} />)}
      </View>
      <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 12 }}>依目前天氣推薦 · 約每 15 分鐘更新</Text>
    </SectionCard>
  );
});

const HOURLY_TREND_HEIGHT = 72;
const HOURLY_TREND_TOP = 28;
const HOURLY_TREND_BOTTOM = 58;

const parseTemperature = (value: string) => {
  const temperature = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(temperature) ? temperature : 0;
};

const createSmoothTrendPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
};

function HourlyTemperatureTrend({ forecast, width }: { forecast: HourlyForecast[]; width: number }) {
  const temperatures = forecast.map((item) => parseTemperature(item.temp));
  const minimum = Math.min(...temperatures);
  const maximum = Math.max(...temperatures);
  const temperatureRange = maximum - minimum;
  const columnWidth = width / Math.max(forecast.length, 1);
  const points = temperatures.map((temperature, index) => ({
    x: columnWidth * (index + 0.5),
    y: temperatureRange === 0
      ? (HOURLY_TREND_TOP + HOURLY_TREND_BOTTOM) / 2
      : HOURLY_TREND_BOTTOM - ((temperature - minimum) / temperatureRange) * (HOURLY_TREND_BOTTOM - HOURLY_TREND_TOP),
  }));

  return (
    <View
      accessible
      accessibilityLabel={`未來六小時溫度走勢，最高 ${maximum} 度，最低 ${minimum} 度`}
      style={{ width, height: HOURLY_TREND_HEIGHT }}
    >
      <Svg width={width} height={HOURLY_TREND_HEIGHT}>
        <Path d={createSmoothTrendPath(points)} fill="none" stroke="#475569" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <Circle key={`${forecast[index].time}-${index}`} cx={point.x} cy={point.y} r={4.5} fill="#FFFFFF" stroke="#475569" strokeWidth={1.75} />
        ))}
      </Svg>
      {forecast.map((item, index) => (
        <Text
          key={`${item.time}-temperature-${index}`}
          selectable
          style={{
            position: 'absolute',
            top: 0,
            left: columnWidth * index,
            width: columnWidth,
            color: '#334155',
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.temp}
        </Text>
      ))}
    </View>
  );
}

export const HourlyForecastSection = memo(function HourlyForecastSection({ forecast }: { forecast: HourlyForecast[] }) {
  const visibleForecast = forecast.slice(0, 6);
  const [contentWidth, setContentWidth] = useState(0);

  return (
    <SectionCard paddingBottom={20}>
      <SectionHeading>未來 6 小時</SectionHeading>
      <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)} style={{ gap: 8 }}>
        {contentWidth > 0 && visibleForecast.length > 1 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: contentWidth / visibleForecast.length,
              width: 1,
              backgroundColor: '#E2E8F0',
            }}
          />
        ) : null}
        <View style={{ flexDirection: 'row' }}>
          {visibleForecast.map((item, index) => (
            <View key={`${item.time}-${index}`} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Text selectable style={{ color: index === 0 ? '#2563EB' : '#64748B', fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{item.time}</Text>
              <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
                <WeatherIcon name={item.icon} size={38} color={item.iconColor} />
              </View>
            </View>
          ))}
        </View>

        {contentWidth > 0 && visibleForecast.length > 0 ? (
          <HourlyTemperatureTrend forecast={visibleForecast} width={contentWidth} />
        ) : null}

        <View style={{ flexDirection: 'row' }}>
          {visibleForecast.map((item, index) => (
            <View key={`${item.time}-pop-${index}`} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text selectable style={{ color: '#2563EB', fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{item.pop}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </SectionCard>
  );
});

function FavoriteButton({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [isFavorite, progress]);

  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ padding: 4 }}>
      <Animated.View style={{ transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-15deg'] }) }] }}>
        <HeartIcon isFavorite={isFavorite} />
      </Animated.View>
    </Pressable>
  );
}

const HEART_OUTLINE_PATH = 'M19.0001 14V17H22.0001V19H18.9991L19.0001 22H17.0001L16.9991 19H14.0001V17H17.0001V14H19.0001ZM20.2426 4.75748C22.505 7.02453 22.5829 10.6361 20.4795 12.9921L19.06 11.5741C20.3901 10.05 20.3201 7.66 18.827 6.17022C17.3244 4.67104 14.9076 4.60713 13.337 6.017L12.0019 7.21536L10.6661 6.01793C9.09098 4.60609 6.67506 4.66821 5.17157 6.1717C3.68183 7.66143 3.60704 10.0474 4.97993 11.6233L13.412 20.0691L11.9999 21.4851L3.52138 12.9931C1.41705 10.6371 1.49571 7.01913 3.75736 4.75748C6.02157 2.49327 9.64519 2.41699 12.001 4.52865C14.35 2.42012 17.98 2.49012 20.2426 4.75748Z';

const HEART_FILLED_PATH = 'M12.001 4.52853C14.35 2.42 17.98 2.49 20.2426 4.75736C22.5053 7.02472 22.583 10.637 20.4786 12.993L11.9999 21.485L3.52138 12.993C1.41705 10.637 1.49571 7.01901 3.75736 4.75736C6.02157 2.49315 9.64519 2.41687 12.001 4.52853Z';

const AQI_LEAF_PATH = 'M20.998 3V5C20.998 14.6274 15.6255 19 8.99805 19L7.0964 18.9999C7.3079 15.9876 8.24541 14.1648 10.6939 11.9989C11.8979 10.9338 11.7965 10.3189 11.2029 10.6721C7.1193 13.1016 5.09114 16.3862 5.00119 21.6302L4.99805 22H2.99805C2.99805 20.6373 3.11376 19.3997 3.34381 18.2682C3.1133 16.9741 2.99805 15.2176 2.99805 13C2.99805 7.47715 7.4752 3 12.998 3C14.998 3 16.998 4 20.998 3Z';

function AqiLeafIcon({ size = 16, color = '#22C55E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={AQI_LEAF_PATH} />
    </Svg>
  );
}

function HeartIcon({ isFavorite }: { isFavorite: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill={isFavorite ? '#EF4444' : '#CBD5E1'}>
      <Path d={isFavorite ? HEART_FILLED_PATH : HEART_OUTLINE_PATH} />
    </Svg>
  );
}

interface WeeklyForecastSectionProps {
  forecast: WeeklyForecast[];
  period: WeeklyPeriod;
  onChangePeriod: (period: WeeklyPeriod) => void;
}

export const WeeklyForecastSection = memo(function WeeklyForecastSection({ forecast, period, onChangePeriod }: WeeklyForecastSectionProps) {
  return (
    <SectionCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 3, height: 14, backgroundColor: '#0057D9', borderRadius: 999 }} />
          <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '600' }}>一週預報</Text>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 2, borderRadius: 8 }}>
          {(['day', 'night'] as const).map((item) => {
            const selected = period === item;
            return (
              <Pressable key={item} onPress={() => onChangePeriod(item)} style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: selected ? '#FFFFFF' : 'transparent', boxShadow: selected ? subtleShadow : undefined }}>
                <Text style={{ color: selected ? '#1E293B' : '#94A3B8', fontSize: 11, fontWeight: '500' }}>{item === 'day' ? '白天' : '夜晚'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 16 }}>
        {forecast.map((item, index) => {
          const icon = period === 'day' ? item.icon : item.nightIcon;
          const iconColor = period === 'day' ? item.iconColor : item.nightIconColor;
          const pop = period === 'day' ? item.pop : item.nightPop;
          const min = period === 'day' ? item.dayMin ?? item.min : item.nightMin ?? item.min;
          const max = period === 'day' ? item.dayMax ?? item.max : item.nightMax ?? item.max;
          const progressLeft = period === 'day' ? item.dayProgressLeft ?? item.progressLeft : item.nightProgressLeft ?? item.progressLeft;
          const progressWidth = period === 'day' ? item.dayProgressWidth ?? item.progressWidth : item.nightProgressWidth ?? item.progressWidth;
          const hasProbability = pop !== '—';
          return (
            <View key={`${item.day}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text selectable numberOfLines={1} style={{ width: 66, color: index === 0 ? '#2563EB' : '#475569', fontSize: 12, fontWeight: '500' }}>{item.day}</Text>
              <View accessible accessibilityLabel={hasProbability ? `降雨機率 ${pop}` : '降雨機率未提供'} style={{ width: 72, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <WeatherIcon name={icon} size={32} color={iconColor} />
                </View>
                {hasProbability ? (
                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text selectable style={{ color: '#2563EB', fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{pop}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <Text selectable style={{ width: 24, textAlign: 'right', color: '#94A3B8', fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{min}°</Text>
                <View style={{ width: 80, height: 5, borderRadius: 999, backgroundColor: '#F1F5F9', boxShadow: '0 0 0 1px #CBD5E1', overflow: 'hidden' }}>
                  <LinearGradient colors={['#3B82F6', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: progressLeft, width: progressWidth, height: 5, borderRadius: 999 }} />
                </View>
                <Text selectable style={{ width: 24, textAlign: 'right', color: '#334155', fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{max}°</Text>
              </View>
            </View>
          );
        })}
      </View>
    </SectionCard>
  );
});

export const AstroSection = memo(function AstroSection({ data }: { data: AppData['astro'] }) {
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const solarProgress = getSolarProgress(nowMinutes, data.sunrise, data.sunset);
  const solarPosition = getSolarArcPosition(solarProgress);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <SectionCard>
      <SectionHeading>日月預報</SectionHeading>
      <View style={{ position: 'relative', height: 190, borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: '#E8F1FA', backgroundColor: '#FFFFFF', overflow: 'hidden', boxShadow: subtleShadow }}>
        <LinearGradient colors={['#FFFFFF', '#F4F9FF', '#FFFDF6']} locations={[0, 0.58, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />

        <View style={{ position: 'absolute', top: 18, left: 20, right: 20, zIndex: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <WeatherIcon name="sun" size={16} color="#F59E0B" fill="#FDE68A" strokeWidth={1.8} />
              <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '500' }}>今日・日出</Text>
            </View>
            <Text selectable style={{ color: '#1E293B', fontSize: 21, lineHeight: 25, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{data.sunrise}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '500' }}>今日・日落</Text>
              <WeatherIcon name="sun" size={16} color="#F59E0B" fill="#FDE68A" strokeWidth={1.8} />
            </View>
            <Text selectable style={{ color: '#1E293B', fontSize: 21, lineHeight: 25, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{data.sunset}</Text>
          </View>
        </View>

        <View style={{ position: 'absolute', left: 14, right: 14, top: 18, height: 160 }}>
          <Svg width="100%" height={160} viewBox="0 0 320 160" preserveAspectRatio="none">
            <Path d="M 24 146 Q 160 48 296 146" stroke="rgba(245,158,11,0.10)" strokeWidth={12} strokeLinecap="round" fill="none" />
            <Path d="M 24 146 Q 160 48 296 146" stroke="#F6C453" strokeWidth={2.25} strokeLinecap="round" fill="none" />
          </Svg>
          <View style={{ position: 'absolute', left: `${(solarPosition.x / 320) * 100}%`, top: solarPosition.y, width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8D8', transform: [{ translateX: -17 }, { translateY: -17 }], boxShadow: '0 0 24px rgba(250,184,36,0.52)' }}>
            <WeatherIcon name="sun" size={23} color="#F59E0B" fill="#FACC15" strokeWidth={1.5} />
          </View>
        </View>
      </View>
    </SectionCard>
  );
});
