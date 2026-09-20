import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { WeatherIcon } from '@/components/weather-icon';
import { searchTaiwanLocations, TAIWAN_LOCATION_COUNT } from '@/data/taiwan-locations';
import { weatherApi } from '@/services/weather-api';
import type { AppData, TaiwanLocation } from '@/types/weather';

const SETTINGS_ICON_PATH = 'M2.13127 13.6308C1.9492 12.5349 1.95521 11.434 2.13216 10.3695C3.23337 10.3963 4.22374 9.86798 4.60865 8.93871C4.99357 8.00944 4.66685 6.93557 3.86926 6.17581C4.49685 5.29798 5.27105 4.51528 6.17471 3.86911C6.9345 4.66716 8.0087 4.99416 8.93822 4.60914C9.86774 4.22412 10.3961 3.23332 10.369 2.13176C11.4649 1.94969 12.5658 1.9557 13.6303 2.13265C13.6036 3.23385 14.1319 4.22422 15.0612 4.60914C15.9904 4.99406 17.0643 4.66733 17.8241 3.86975C18.7019 4.49734 19.4846 5.27153 20.1308 6.1752C19.3327 6.93499 19.0057 8.00919 19.3907 8.93871C19.7757 9.86823 20.7665 10.3966 21.8681 10.3695C22.0502 11.4654 22.0442 12.5663 21.8672 13.6308C20.766 13.6041 19.7756 14.1324 19.3907 15.0616C19.0058 15.9909 19.3325 17.0648 20.1301 17.8245C19.5025 18.7024 18.7283 19.4851 17.8247 20.1312C17.0649 19.3332 15.9907 19.0062 15.0612 19.3912C14.1316 19.7762 13.6033 20.767 13.6303 21.8686C12.5344 22.0507 11.4335 22.0447 10.3691 21.8677C10.3958 20.7665 9.86749 19.7761 8.93822 19.3912C8.00895 19.0063 6.93508 19.333 6.17532 20.1306C5.29749 19.503 4.51479 18.7288 3.86862 17.8252C4.66667 17.0654 4.99367 15.9912 4.60865 15.0616C4.22363 14.1321 3.23284 13.6038 2.13127 13.6308ZM11.9997 15.0002C13.6565 15.0002 14.9997 13.657 14.9997 12.0002C14.9997 10.3433 13.6565 9.00018 11.9997 9.00018C10.3428 9.00018 8.99969 10.3433 8.99969 12.0002C8.99969 13.657 10.3428 15.0002 11.9997 15.0002Z';

function SettingsIcon({ size = 22, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={SETTINGS_ICON_PATH} />
    </Svg>
  );
}

interface FavoritesSidebarProps {
  open: boolean;
  data: AppData;
  favorites: TaiwanLocation[];
  onClose: () => void;
  onSelectLocation: (location: TaiwanLocation) => void;
  onUseCurrentLocation: () => Promise<void>;
  onRemoveFavorite: (location: TaiwanLocation) => void;
  onSettings: () => void;
}

const sameLocation = (left: TaiwanLocation, right: TaiwanLocation) => left.city === right.city && left.district === right.district;

const SPONSOR_URL = ''; // 之後填入正式贊助連結

function FacebookIcon({ size = 22, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.001 2C6.47813 2 2.00098 6.47715 2.00098 12C2.00098 16.9913 5.65783 21.1283 10.4385 21.8785V14.8906H7.89941V12H10.4385V9.79688C10.4385 7.29063 11.9314 5.90625 14.2156 5.90625C15.3097 5.90625 16.4541 6.10156 16.4541 6.10156V8.5625H15.1931C13.9509 8.5625 13.5635 9.33334 13.5635 10.1242V12H16.3369L15.8936 14.8906H13.5635V21.8785C18.3441 21.1283 22.001 16.9913 22.001 12C22.001 6.47715 17.5238 2 12.001 2Z"
        fill={color}
      />
    </Svg>
  );
}

function InstagramIcon({ size = 22, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        fillRule="evenodd"
        d="M18.5 2h-13A3.5 3.5 0 0 0 2 5.5v13A3.5 3.5 0 0 0 5.5 22h13a3.5 3.5 0 0 0 3.5-3.5v-13A3.5 3.5 0 0 0 18.5 2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM17.25 6a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
      />
    </Svg>
  );
}

export function FavoritesSidebar({ open, data, favorites, onClose, onSelectLocation, onUseCurrentLocation, onRemoveFavorite, onSettings }: FavoritesSidebarProps) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [searchText, setSearchText] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [rendered, setRendered] = useState(open);
  const [favoriteTemperatures, setFavoriteTemperatures] = useState<Record<string, string>>({});
  const currentLocation: TaiwanLocation = { id: `${data.location.city}-${data.location.district}`, city: data.location.city, district: data.location.district };
  const results = useMemo(() => searchTaiwanLocations(searchText), [searchText]);

  useEffect(() => {
    if (open) setRendered(true);
    const animation = Animated.timing(progress, { toValue: open ? 1 : 0, duration: open ? 500 : 360, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished && !open) setRendered(false); });
    if (!open) setSearchText('');
    return () => animation.stop();
  }, [open, progress]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFavoriteTemperatures({});
    favorites.forEach((location) => {
      void weatherApi.geocodeLocation(location)
        .then((coordinates) => weatherApi.getCurrentWeather(coordinates, location))
        .then((current) => {
          if (cancelled) return;
          const temperature = `${Math.round(current.observation.temperature)}°`;
          setFavoriteTemperatures((previous) => ({ ...previous, [location.id]: temperature }));
        })
        .catch(() => {
          if (cancelled) return;
          setFavoriteTemperatures((previous) => ({ ...previous, [location.id]: '--' }));
        });
    });
    return () => { cancelled = true; };
  }, [favorites, open]);
  if (!rendered) return null;

  const select = (location: TaiwanLocation) => {
    onSelectLocation(location);
    setSearchText('');
    onClose();
  };

  const useCurrentLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      await onUseCurrentLocation();
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.40)', opacity: progress }}><Pressable onPress={onClose} style={{ flex: 1 }} /></Animated.View>
      <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 260, backgroundColor: '#FFFFFF', boxShadow: '-10px 0 30px rgba(0,0,0,0.16)', transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [260, 0] }) }] }}>
        <View style={{ padding: 20, paddingTop: Math.max(insets.top, 20), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '600' }}>天氣概況Weather</Text>
          <Pressable onPress={onClose} style={({ pressed }) => ({ padding: 6, borderRadius: 999, backgroundColor: '#F8FAFC', transform: [{ scale: pressed ? 0.95 : 1 }] })}><WeatherIcon name="x" size={18} color="#94A3B8" /></Pressable>
        </View>
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <View style={{ flex: 1, minWidth: 0, position: 'relative', justifyContent: 'center' }}>
            <WeatherIcon name="search" size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
            {searchText.length === 0 ? <Text pointerEvents="none" numberOfLines={1} style={{ position: 'absolute', left: 36, right: 12, zIndex: 1, color: '#94A3B8', fontSize: 13 }}>搜尋全台 {TAIWAN_LOCATION_COUNT} 個鄉鎮市區</Text> : null}
            <TextInput value={searchText} onChangeText={setSearchText} autoCorrect={false} returnKeyType="search" accessibilityLabel="搜尋鄉鎮市區" style={{ width: '100%', height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', color: '#334155', fontSize: 16, paddingVertical: 8, paddingLeft: 36, paddingRight: 12 }} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={isLocating ? '定位中' : '現在位置'} accessibilityState={{ disabled: isLocating, busy: isLocating }} disabled={isLocating} onPress={() => void useCurrentLocation()} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#EFF6FF', opacity: isLocating ? 0.72 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              {isLocating ? <ActivityIndicator size={18} color="#2563EB" /> : <WeatherIcon name="locate" size={18} color="#2563EB" />}
            </Pressable>
          </View>

          {searchText.trim() ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <Text style={{ marginBottom: 10, color: '#94A3B8', fontSize: 11, fontWeight: '500' }}>搜尋結果 {results.length} 筆</Text>
              {results.map((location) => (
                <Pressable key={location.id} onPress={() => select(location)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 10, marginBottom: 6, borderRadius: 12, backgroundColor: sameLocation(location, currentLocation) ? '#EFF6FF' : pressed ? '#F8FAFC' : '#FFFFFF' })}>
                  <WeatherIcon name="locate" size={16} color={sameLocation(location, currentLocation) ? '#2563EB' : '#94A3B8'} />
                  <View style={{ flex: 1 }}><Text style={{ color: '#334155', fontSize: 14, fontWeight: '600' }}>{location.district}</Text><Text style={{ marginTop: 2, color: '#94A3B8', fontSize: 11 }}>{location.city}</Text></View>
                </Pressable>
              ))}
              {results.length === 0 ? <View style={{ alignItems: 'center', paddingVertical: 28 }}><Text style={{ color: '#94A3B8', fontSize: 13 }}>找不到符合的行政區</Text></View> : null}
            </ScrollView>
          ) : (
            <>
              <View style={{ height: 1, marginVertical: 12, backgroundColor: '#F1F5F9' }} />
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {favorites.length ? favorites.map((location) => (
                  <Pressable key={location.id} onPress={() => select(location)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}><Pressable onPress={() => onRemoveFavorite(location)} hitSlop={8} style={{ padding: 4 }}><WeatherIcon name="heart" size={16} color="#EF4444" fill="#EF4444" /></Pressable><Text numberOfLines={1} style={{ color: '#334155', fontSize: 14, fontWeight: '600' }}>{location.city}{location.district}</Text></View>
                    <Text style={{ color: '#334155', fontSize: 14, fontWeight: '600' }}>{favoriteTemperatures[location.id] ?? '--'}</Text>
                  </Pressable>
                )) : <View style={{ alignItems: 'center', paddingVertical: 24 }}><Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>目前尚無最愛縣市</Text></View>}
              </ScrollView>
              <View style={{ paddingTop: 24, borderTopWidth: 1, borderTopColor: '#F8FAFC' }}>
                <Pressable disabled={!SPONSOR_URL} accessibilityRole="link" accessibilityLabel="贊助我們" onPress={() => { if (SPONSOR_URL) void Linking.openURL(SPONSOR_URL); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#2563EB', backgroundColor: '#FFFFFF', opacity: SPONSOR_URL ? 1 : 0.6, transform: [{ scale: pressed ? 0.98 : 1 }] })}><WeatherIcon name="cup-soda" size={16} color="#2563EB" /><Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '600' }}>贊助我們</Text></Pressable>
                <View style={{ height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -8, marginRight: -8, marginBottom: -8, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable accessibilityRole="link" accessibilityLabel="Facebook" onPress={() => void Linking.openURL('https://www.facebook.com/share/1HZ4pmUAT2/?mibextid=wwXIfr')} style={({ pressed }) => ({ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: pressed ? '#F8FAFC' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}><FacebookIcon size={22} color="#94A3B8" /></Pressable>
                    <Pressable accessibilityRole="link" accessibilityLabel="Instagram" onPress={() => void Linking.openURL('https://www.instagram.com/weather_tas?igsh=dWpla2E0enZqdjI4')} style={({ pressed }) => ({ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: pressed ? '#F8FAFC' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}><InstagramIcon size={22} color="#94A3B8" /></Pressable>
                  </View>
                  <Pressable onPress={onSettings} style={({ pressed }) => ({ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: pressed ? '#F8FAFC' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}><SettingsIcon size={22} color="#94A3B8" /></Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
