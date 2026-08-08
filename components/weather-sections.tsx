import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { SectionCard, SectionHeading, StatCard, subtleShadow } from '@/components/common';
import { WeatherIcon } from '@/components/weather-icon';
import { resolveFeelsLikeStatus, resolveHumidityStatus, resolveWindStatus } from '@/data/weather-stat-status';
import { WeatherScene } from '@/src/weather-scene/components/weather-scene';
import { resolveWeatherScene } from '@/src/weather-scene/engine/resolve-weather-scene';
import type { WeatherSceneInput } from '@/src/weather-scene/types';
import type { AppData, HourlyForecast, LifeSuggestion, SrdiPresentation, WeeklyForecast, WeeklyPeriod } from '@/types/weather';

interface WeatherCardProps {
  data: AppData;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenAqi: () => void;
  sceneInput?: WeatherSceneInput;
}

const weatherConditionImages = {
  晴朗: require('../assets/weather-clear.png'),
  晴時多雲: require('../assets/weather-partly-cloudy-magnific.png'),
  多雲: require('../assets/weather-cloudy.png'),
  陰天: require('../assets/weather-overcast.png'),
  有霧: require('../assets/weather-cloudy.png'),
  毛毛雨: require('../assets/weather-rain.png'),
  有雨: require('../assets/weather-rain.png'),
  雷雨: require('../assets/weather-rain.png'),
  降雪: require('../assets/weather-rain.png'),
  天氣變化: require('../assets/weather-partly-cloudy-magnific.png'),
} as const;

export const WeatherCard = memo(function WeatherCard({ data, isFavorite, onToggleFavorite, onOpenAqi, sceneInput }: WeatherCardProps) {
  const [temperatureWidth, setTemperatureWidth] = useState(72);
  const statusCharacters = [...data.weather.status];
  const estimatedCharacterWidth = 14;
  const comfortableGap = 8;
  const naturalStatusWidth = statusCharacters.length * estimatedCharacterWidth;
  const comfortableStatusWidth = naturalStatusWidth + Math.max(0, statusCharacters.length - 1) * comfortableGap;
  const statusWidth = Math.max(naturalStatusWidth, Math.min(temperatureWidth, comfortableStatusWidth));
  const statusOffset = (temperatureWidth - statusWidth) / 2;
  const conditionImage = weatherConditionImages[data.weather.status as keyof typeof weatherConditionImages] ?? weatherConditionImages.晴時多雲;
  const feelsLikeStatus = resolveFeelsLikeStatus(data.weather.feelsLike);
  const humidityStatus = resolveHumidityStatus(data.weather.humidity);
  const windStatus = resolveWindStatus(data.weather.windSpeed);
  const scene = useMemo(() => sceneInput ? resolveWeatherScene(sceneInput) : undefined, [sceneInput]);
  const primaryText = scene?.surface.textPrimary ?? '#1E293B';
  const secondaryText = scene?.surface.textSecondary ?? '#64748B';
  const isNightConditionWithoutSun = scene && scene.celestial.mode !== 'sun' && ['晴朗','晴時多雲'].includes(data.weather.status);

  return (
    <View style={{ backgroundColor: scene?.surface.cardTint ?? '#FFFFFF', padding: 20, paddingBottom: 24, borderRadius: 28, borderCurve: 'continuous', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
      {scene ? <WeatherScene scene={scene} /> : <LinearGradient colors={['rgba(224,242,254,0.70)', 'rgba(239,246,255,0.30)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }} />}
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.90)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }} />
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <Text style={{ color: primaryText, fontSize: 18, fontWeight: '600', letterSpacing: 0.4 }}>
            {data.location.city}{data.location.district}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#4ADE80' }} />
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
          <View style={{ width: 96, height: 96, marginRight: 4, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -4 },{scale:scene?.celestial.mode==='none'?1:(scene?.celestial.scale ?? 1)}],opacity:scene?.celestial.mode==='none'?1:(scene?.celestial.opacity ?? 1),filter:scene&&scene.celestial.mode!=='none'?[{brightness:scene.celestial.brightness},{saturate:scene.celestial.saturation}]:undefined,boxShadow:scene&&scene.celestial.glow>0?`0 0 ${Math.round(18+scene.celestial.glow*24)}px rgba(226,232,240,${scene.celestial.glow*.35})`:undefined }}>
            {isNightConditionWithoutSun && scene.celestial.mode === 'moon' ? <WeatherIcon name="moon" size={66} color={scene.palette.cloudLight} fill={scene.palette.cloudLight} strokeWidth={1.3}/>:<Image source={isNightConditionWithoutSun?weatherConditionImages.多雲:conditionImage} contentFit="contain" accessibilityLabel={`${data.weather.status}天氣狀態`} style={{ width: '85%', height: '85%' }} />}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
        <StatCard icon="thermometer" label="體感" value={data.weather.feelsLike} status={feelsLikeStatus.label} iconColor="#F87171" badgeBg={feelsLikeStatus.badgeBg} badgeText={feelsLikeStatus.badgeText} />
        <StatCard icon="droplets" label="濕度" value={data.weather.humidity} status={humidityStatus.label} iconColor="#60A5FA" badgeBg={humidityStatus.badgeBg} badgeText={humidityStatus.badgeText} />
        <StatCard icon="wind" label="風速" value={data.weather.windSpeed} status={windStatus.label} iconColor="#94A3B8" badgeBg={windStatus.badgeBg} badgeText={windStatus.badgeText} />
      </View>

      <Pressable onPress={onOpenAqi} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}>
        <WeatherIcon name="leaf" size={16} color="#22C55E" />
        <View style={{ flex: 1, height: 5 }}>
          <LinearGradient colors={['#4ADE80', '#FACC15', '#8B4513']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 5, borderRadius: 999 }} />
          <View style={{ position: 'absolute', left: '15%', top: -6, width: 14, height: 14, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: '#4ADE80', boxShadow: subtleShadow }} />
        </View>
        <Text style={{ color: '#16A34A', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {data.aqi.value} <Text style={{ color: '#94A3B8', fontWeight: '400', fontSize: 10 }}>AQI</Text>
        </Text>
      </Pressable>
    </View>
  );
});

function SuggestionCard({ item }: { item: LifeSuggestion }) {
  return (
    <Pressable style={({ pressed }) => ({ width: 90, minWidth: 90, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, marginHorizontal: 4, borderRadius: 18, borderCurve: 'continuous', borderWidth: 1, borderColor: '#F8FAFC', backgroundColor: '#FFFFFF', boxShadow: pressed ? '0 4px 8px rgba(0,0,0,0.08)' : subtleShadow, transform: [{ translateY: pressed ? -4 : 0 }] })}>
      <View style={{ padding: 6, borderRadius: 12, backgroundColor: item.iconBg, marginBottom: 8 }}>
        <WeatherIcon name={item.icon} size={18} color={item.iconColor} />
      </View>
      <Text style={{ color: '#9CA3AF', fontSize: 10, marginBottom: 2 }}>{item.label}</Text>
      <Text style={{ color: '#374151', fontSize: 13, fontWeight: '600', marginBottom: 2 }}>{item.value}</Text>
      <Text style={{ color: '#9CA3AF', fontSize: 9 }}>{item.desc}</Text>
    </Pressable>
  );
}

export const LifeSuggestionsSection = memo(function LifeSuggestionsSection({ suggestions, srdi }: { suggestions: LifeSuggestion[]; srdi: SrdiPresentation }) {
  return (
    <SectionCard>
      <SectionHeading>今天適合做什麼</SectionHeading>
      <Pressable style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: 16, borderRadius: 22, borderCurve: 'continuous', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F8FAFC', boxShadow: pressed ? '0 4px 8px rgba(0,0,0,0.08)' : subtleShadow, transform: [{ translateY: pressed ? -4 : 0 }] })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 }}>
          <View style={{ padding: 12, borderRadius: 18, backgroundColor: srdi.iconBg, boxShadow: subtleShadow }}>
            <WeatherIcon name="shield" size={24} color={srdi.colorText} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '600' }}>機車族防禦指數</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: srdi.badgeBg }}>
                <Text style={{ color: srdi.colorText, fontSize: 9, fontWeight: '600' }}>{srdi.status}</Text>
              </View>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>{srdi.desc}</Text>
          </View>
        </View>
        <View style={{ minWidth: 56, alignItems: 'center', marginLeft: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F8FAFC', backgroundColor: '#FFFFFF', boxShadow: subtleShadow }}>
          <Text style={{ color: '#94A3B8', fontSize: 9, marginBottom: 2 }}>評級</Text>
          <Text style={{ color: srdi.colorText, fontSize: 14, fontWeight: '700' }}>{srdi.rating}</Text>
        </View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={98} decelerationRate="fast" contentContainerStyle={{ paddingBottom: 8, marginHorizontal: -4 }}>
        {suggestions.map((item) => <SuggestionCard key={item.id} item={item} />)}
      </ScrollView>
    </SectionCard>
  );
});

export const HourlyForecastSection = memo(function HourlyForecastSection({ forecast }: { forecast: HourlyForecast[] }) {
  return (
    <SectionCard paddingBottom={20}>
      <SectionHeading>未來 6 小時</SectionHeading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
        {forecast.map((item, index) => (
          <View key={`${item.time}-${index}`} style={{ width: 44, alignItems: 'center' }}>
            <Text style={{ color: index === 0 ? '#2563EB' : '#64748B', fontSize: 11, fontWeight: '500', marginBottom: 8 }}>{item.time}</Text>
            <WeatherIcon name={item.icon} size={22} color={item.iconColor} style={{ marginBottom: 8 }} />
            <Text style={{ color: '#334155', fontSize: 15, fontWeight: '600', marginBottom: 4, fontVariant: ['tabular-nums'] }}>{item.temp}</Text>
            <Text style={{ color: '#60A5FA', fontSize: 9, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{item.pop}</Text>
          </View>
        ))}
      </ScrollView>
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
        <Heart size={18} color={isFavorite ? '#EF4444' : '#CBD5E1'} fill={isFavorite ? '#EF4444' : 'none'} />
      </Animated.View>
    </Pressable>
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
          <View style={{ width: 6, height: 14, backgroundColor: '#3B82F6', borderRadius: 999 }} />
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
          return (
            <View key={`${item.day}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ width: 40, color: index === 0 ? '#2563EB' : '#475569', fontSize: 13, fontWeight: '500' }}>{item.day}</Text>
              <View style={{ width: 64, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <WeatherIcon name={icon} size={18} color={iconColor} />
                <Text style={{ color: '#60A5FA', fontSize: 10, fontWeight: '500' }}>{pop}</Text>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <Text style={{ width: 24, textAlign: 'right', color: '#94A3B8', fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{item.min}°</Text>
                <View style={{ width: 80, height: 5, borderRadius: 999, backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                  <LinearGradient colors={['#93C5FD', '#FACC15']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: item.progressLeft, width: item.progressWidth, height: 5, borderRadius: 999 }} />
                </View>
                <Text style={{ width: 24, textAlign: 'right', color: '#334155', fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{item.max}°</Text>
              </View>
            </View>
          );
        })}
      </View>
    </SectionCard>
  );
});

export const AstroSection = memo(function AstroSection({ data }: { data: AppData['astro'] }) {
  const items = [
    { title: '太陽', icon: 'sun' as const, color: '#FACC15', fill: '#FDE047', phase: '', firstLabel: '日出', first: data.sunrise, secondLabel: '日落', second: data.sunset },
    { title: '月亮', icon: 'moon' as const, color: '#818CF8', fill: '#818CF8', phase: data.moonPhase, firstLabel: '月出', first: data.moonrise, secondLabel: '月落', second: data.moonset },
  ];
  return (
    <SectionCard>
      <SectionHeading>日月預報</SectionHeading>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {items.map((item) => (
          <Pressable key={item.title} style={({ pressed }) => ({ flex: 1, alignItems: 'center', padding: 16, borderRadius: 20, borderCurve: 'continuous', borderWidth: 1, borderColor: '#F8FAFC', backgroundColor: '#FFFFFF', boxShadow: pressed ? '0 4px 8px rgba(0,0,0,0.08)' : subtleShadow, transform: [{ translateY: pressed ? -4 : 0 }] })}>
            <WeatherIcon name={item.icon} size={26} color={item.color} fill={item.fill} strokeWidth={1.5} style={{ marginBottom: 8 }} />
            <Text style={{ color: '#334155', fontSize: 13, fontWeight: '600', marginBottom: 12 }}>
              {item.title}{item.phase ? <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '400' }}> {item.phase}</Text> : null}
            </Text>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <View style={{ alignItems: 'center' }}><Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>{item.firstLabel}</Text><Text style={{ color: '#334155', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{item.first}</Text></View>
              <View style={{ alignItems: 'center' }}><Text style={{ color: '#94A3B8', fontSize: 11, marginBottom: 4 }}>{item.secondLabel}</Text><Text style={{ color: '#334155', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{item.second}</Text></View>
            </View>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
});
