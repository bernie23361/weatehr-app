import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WeatherIcon } from '@/components/weather-icon';
import { searchTaiwanLocations, TAIWAN_LOCATION_COUNT } from '@/data/taiwan-locations';
import type { AppData, TaiwanLocation } from '@/types/weather';

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

export function FavoritesSidebar({ open, data, favorites, onClose, onSelectLocation, onUseCurrentLocation, onRemoveFavorite, onSettings }: FavoritesSidebarProps) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [searchText, setSearchText] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [rendered, setRendered] = useState(open);
  const currentLocation: TaiwanLocation = { id: `${data.location.city}-${data.location.district}`, city: data.location.city, district: data.location.district };
  const results = useMemo(() => searchTaiwanLocations(searchText), [searchText]);

  useEffect(() => {
    if (open) setRendered(true);
    const animation = Animated.timing(progress, { toValue: open ? 1 : 0, duration: open ? 500 : 360, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished && !open) setRendered(false); });
    if (!open) setSearchText('');
    return () => animation.stop();
  }, [open, progress]);
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
          <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '600' }}>縣市收藏</Text>
          <Pressable onPress={onClose} style={({ pressed }) => ({ padding: 6, borderRadius: 999, backgroundColor: '#F8FAFC', transform: [{ scale: pressed ? 0.95 : 1 }] })}><WeatherIcon name="x" size={18} color="#94A3B8" /></Pressable>
        </View>
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ position: 'relative', justifyContent: 'center', marginBottom: 24 }}>
            <WeatherIcon name="search" size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, zIndex: 1 }} />
            {searchText.length === 0 ? <Text pointerEvents="none" numberOfLines={1} style={{ position: 'absolute', left: 36, right: 12, zIndex: 1, color: '#94A3B8', fontSize: 13 }}>搜尋全台 {TAIWAN_LOCATION_COUNT} 個鄉鎮市區</Text> : null}
            <TextInput value={searchText} onChangeText={setSearchText} autoCorrect={false} returnKeyType="search" accessibilityLabel="搜尋鄉鎮市區" style={{ width: '100%', borderRadius: 12, backgroundColor: '#F1F5F9', color: '#334155', fontSize: 16, paddingVertical: 8, paddingLeft: 36, paddingRight: 12 }} />
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
              <Pressable disabled={isLocating} onPress={() => void useCurrentLocation()} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 12, borderRadius: 12, backgroundColor: '#EFF6FF', opacity: isLocating ? 0.72 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>{isLocating ? <ActivityIndicator size={18} color="#2563EB" /> : <WeatherIcon name="locate" size={18} color="#2563EB" />}<Text style={{ color: '#2563EB', fontSize: 15, fontWeight: '600' }}>{isLocating ? '定位中…' : '現在位置'}</Text></Pressable>
              <View style={{ height: 1, marginVertical: 12, backgroundColor: '#F1F5F9' }} />
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {favorites.length ? favorites.map((location) => (
                  <Pressable key={location.id} onPress={() => select(location)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}><WeatherIcon name="heart" size={16} color="#EF4444" fill="#EF4444" /><Text numberOfLines={1} style={{ color: '#334155', fontSize: 14, fontWeight: '600' }}>{location.city}{location.district}</Text></View>
                    <Pressable onPress={() => onRemoveFavorite(location)} hitSlop={8} style={{ padding: 4 }}><WeatherIcon name="x" size={14} color="#CBD5E1" /></Pressable>
                  </Pressable>
                )) : <View style={{ alignItems: 'center', paddingVertical: 24 }}><Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>目前尚無最愛縣市</Text></View>}
              </ScrollView>
              <View style={{ paddingTop: 24, borderTopWidth: 1, borderTopColor: '#F8FAFC', alignItems: 'flex-end' }}>
                <Pressable onPress={onSettings} style={({ pressed }) => ({ padding: 8, marginRight: -8, marginBottom: -8, borderRadius: 999, backgroundColor: pressed ? '#F8FAFC' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}><WeatherIcon name="settings" size={22} color="#94A3B8" /></Pressable>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
