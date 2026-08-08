import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AqiDrawer } from '@/components/overlays/aqi-drawer';
import { AlarmModal } from '@/components/overlays/alarm-modal';
import { FavoritesSidebar } from '@/components/overlays/favorites-sidebar';
import { SceneQualityModal } from '@/components/overlays/scene-quality-modal';
import { TestNotificationModal } from '@/components/overlays/test-notification-modal';
import { BottomNavigation } from '@/components/bottom-navigation';
import { TopHeader } from '@/components/top-header';
import { WeatherIcon } from '@/components/weather-icon';
import { DisasterPreparednessScreen } from '@/screens/disaster-preparedness-screen';
import { DisasterMapScreen } from '@/screens/disaster-map-screen';
import { AstroSection, HourlyForecastSection, LifeSuggestionsSection, WeatherCard, WeeklyForecastSection } from '@/components/weather-sections';
import { initialAppData, initialHourlyForecast, initialLifeSuggestions, initialWeeklyForecast, pageTitles, srdiLevels } from '@/data/weather-data';
import { ENABLE_ALERT_ENTRY, ENABLE_IWESR } from '@/config/features';
import { weatherApi, type CurrentWeatherObservation } from '@/services/weather-api';
import { getCurrentTaiwanLocation, LocationServiceError } from '@/services/location-service';
import { notificationTypeFromData } from '@/services/notification-service';
import { weatherObservationToSceneInput } from '@/src/weather-scene/adapters/weather-observation-to-scene-input';
import type { SceneQualityPreference } from '@/src/weather-scene/types';
import type { AppTab, TaiwanLocation, WeeklyPeriod } from '@/types/weather';

const placeholderIcons: Partial<Record<AppTab, 'eye' | 'megaphone' | 'user' | 'map'>> = {
  observe: 'eye', warning: 'megaphone', profile: 'user', map: 'map',
};

const INITIAL_COORDINATES = { latitude: 24.158, longitude: 120.683 };

export function WeatherHomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AppTab>('weather');
  const [weeklyTab, setWeeklyTab] = useState<WeeklyPeriod>('day');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState<TaiwanLocation[]>([]);
  const [isAqiDrawerOpen, setIsAqiDrawerOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [appData, setAppData] = useState(initialAppData);
  const [hourlyForecast, setHourlyForecast] = useState(initialHourlyForecast);
  const [weeklyForecast, setWeeklyForecast] = useState(initialWeeklyForecast);
  const [lifeSuggestions, setLifeSuggestions] = useState(initialLifeSuggestions);
  const [weatherObservation, setWeatherObservation] = useState<CurrentWeatherObservation>();
  const [sceneQualityPreference, setSceneQualityPreference] = useState<SceneQualityPreference>('auto');
  const [isSceneQualityOpen, setIsSceneQualityOpen] = useState(false);
  const [isTestNotificationOpen, setIsTestNotificationOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const weatherRequestId = useRef(0);
  const lastWeatherUpdateAt = useRef(0);
  const weatherTarget = useRef({
    coordinates: INITIAL_COORDINATES,
    location: { city: initialAppData.location.city, district: initialAppData.location.district },
  });

  const refreshCurrentWeather = useCallback(async (coordinates: { latitude: number; longitude: number }, location: Pick<TaiwanLocation, 'city' | 'district'>, showError = false): Promise<boolean> => {
    const requestId = ++weatherRequestId.current;
    try {
      const current = await weatherApi.getCurrentWeather(coordinates, location);
      if (requestId !== weatherRequestId.current) return false;
      setAppData((previous) => ({
        ...previous,
        location: { ...previous.location, updateTime: current.updateTime },
        weather: current.data,
      }));
      setWeatherObservation(current.observation);
      void weatherApi.getAQI(current.observation).then((aqi) => {
        if (!aqi || requestId !== weatherRequestId.current) return;
        setAppData((previous) => ({ ...previous, aqi: { ...previous.aqi, ...aqi } }));
      }).catch(() => {
        // 空品服務暫時失敗時保留上一筆資料，不影響即時天氣。
      });
      lastWeatherUpdateAt.current = Date.now();
      return true;
    } catch (error) {
      if (showError && requestId === weatherRequestId.current) Alert.alert('無法更新天氣', '目前無法連接天氣資料服務，已保留上一筆資料。');
      return false;
    }
  }, []);

  const fetchApiData = useCallback(async () => {
    try {
      const [srdi, astro, alerts, hourly, weekly, suggestions] = await Promise.all([
        weatherApi.getSRDI(), weatherApi.getAstroData(),
        weatherApi.getAlerts(), weatherApi.getHourlyForecast(), weatherApi.getWeeklyForecast(), weatherApi.getLifeSuggestions(),
      ]);
      if (srdi || astro || alerts) {
        setAppData((previous) => ({
          ...previous,
          srdi: srdi?.level ?? previous.srdi,
          astro: { ...previous.astro, ...astro },
          alerts: { ...previous.alerts, ...alerts },
        }));
      }
      if (hourly) setHourlyForecast(hourly);
      if (weekly) setWeeklyForecast(weekly);
      if (suggestions) setLifeSuggestions(suggestions);
    } catch (error) {
      // 預留 API 尚未啟用時保留目前畫面資料。
    }
  }, []);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const refreshActiveTarget = () => {
      const target = weatherTarget.current;
      return refreshCurrentWeather(target.coordinates, target.location);
    };
    void refreshActiveTarget().then((succeeded) => {
      if (!succeeded) retryTimer = setTimeout(() => void refreshActiveTarget(), 10_000);
    });
    void fetchApiData();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      const isStale = Date.now() - lastWeatherUpdateAt.current >= 10 * 60_000;
      if (state === 'active' && isStale) void refreshActiveTarget();
    });
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      appStateSubscription.remove();
    };
  }, [fetchApiData, refreshCurrentWeather]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const openAlertFromResponse = (response: Notifications.NotificationResponse) => {
      const { data } = response.notification.request.content;
      if (notificationTypeFromData(data as Record<string, unknown>) !== 'alert') return;
      const { title, body } = response.notification.request.content;
      if (title && body) {
        setAppData((previous) => ({ ...previous, alerts: { hasActiveAlarm: true, title, content: body } }));
        setIsAlarmModalOpen(true);
      }
    };
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) openAlertFromResponse(response); });
    const subscription = Notifications.addNotificationResponseReceivedListener(openAlertFromResponse);
    return () => subscription.remove();
  }, []);

  const currentSrdi = srdiLevels[appData.srdi];
  const sceneInput = useMemo(() => ENABLE_IWESR && weatherObservation ? weatherObservationToSceneInput(weatherObservation, appData, sceneQualityPreference, reducedMotion) : undefined, [appData, reducedMotion, sceneQualityPreference, weatherObservation]);
  const placeholderIcon = placeholderIcons[activeTab];
  const currentLocation: TaiwanLocation = { id: `${appData.location.city}-${appData.location.district}`, city: appData.location.city, district: appData.location.district };
  const isFavorite = favoriteLocations.some((location) => location.id === currentLocation.id);

  const toggleCurrentFavorite = useCallback(() => {
    setFavoriteLocations((previous) => isFavorite
      ? previous.filter((location) => location.id !== currentLocation.id)
      : [...previous, currentLocation]);
  }, [currentLocation, isFavorite]);

  const selectLocation = useCallback(async (location: TaiwanLocation) => {
    setAppData((previous) => ({ ...previous, location: { ...previous.location, city: location.city, district: location.district } }));
    try {
      const coordinates = await weatherApi.geocodeLocation(location);
      weatherTarget.current = { coordinates, location };
      await refreshCurrentWeather(coordinates, location, true);
    } catch (error) {
      Alert.alert('無法更新天氣', `目前找不到${location.city}${location.district}的天氣座標，已保留上一筆資料。`);
    }
  }, [refreshCurrentWeather]);

  const useCurrentLocation = useCallback(async () => {
    try {
      const located = await getCurrentTaiwanLocation();
      setAppData((previous) => ({ ...previous, location: { ...previous.location, city: located.location.city, district: located.location.district } }));
      setIsSidebarOpen(false);
      weatherTarget.current = { coordinates: located.coordinates, location: located.location };
      await refreshCurrentWeather(located.coordinates, located.location, true);
    } catch (error) {
      const reason = error instanceof LocationServiceError ? error.reason : 'unavailable';
      const messages = {
        'permission-denied': '請在 iPhone「設定」中允許 Expo Go 使用定位服務。',
        'services-disabled': '請先開啟 iPhone 的「定位服務」，再重新嘗試。',
        'district-not-found': '已取得座標，但目前無法判定所在的鄉鎮市區。',
        unavailable: '目前無法取得位置，請稍後再試。',
      } as const;
      Alert.alert('無法取得目前位置', messages[reason]);
    }
  }, [refreshCurrentWeather]);

  const showSettings = useCallback(() => {
    setIsSidebarOpen(false);
    setIsTestNotificationOpen(true);
  }, []);

  const openAqiDrawer = useCallback(() => setIsAqiDrawerOpen(true), []);
  const closeAqiDrawer = useCallback(() => setIsAqiDrawerOpen(false), []);
  const closeAlarmModal = useCallback(() => setIsAlarmModalOpen(false), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const openMap = useCallback(() => setActiveTab('map'), []);
  const openAlarmModal = useCallback(() => setIsAlarmModalOpen(true), []);
  const removeFavorite = useCallback((location: TaiwanLocation) => {
    setFavoriteLocations((previous) => previous.filter((item) => item.id !== location.id));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F1F5F9' }}>
      <View style={{ width: Math.min(width, 430), flex: 1, overflow: 'hidden', backgroundColor: '#F4F7F9' }}>
        <TopHeader title={pageTitles[activeTab]} onOpenMap={openMap} onOpenSidebar={openSidebar} />
        {activeTab === 'weather' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 + insets.bottom, gap: 16 }}>
            <WeatherCard data={appData} isFavorite={isFavorite} onToggleFavorite={toggleCurrentFavorite} onOpenAqi={openAqiDrawer} sceneInput={sceneInput} />
            <LifeSuggestionsSection suggestions={lifeSuggestions} srdi={currentSrdi} />
            <HourlyForecastSection forecast={hourlyForecast} />
            <WeeklyForecastSection forecast={weeklyForecast} period={weeklyTab} onChangePeriod={setWeeklyTab} />
            <AstroSection data={appData.astro} />
          </ScrollView>
        ) : activeTab === 'warning' ? (
          <DisasterMapScreen bottomInset={insets.bottom} />
        ) : activeTab === 'map' ? (
          <DisasterPreparednessScreen bottomInset={insets.bottom} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
            {placeholderIcon ? <WeatherIcon name={placeholderIcon} size={48} color="#CBD5E1" style={{ marginBottom: 16 }} /> : null}
            <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>{pageTitles[activeTab]}頁面建置中</Text>
          </View>
        )}

        {ENABLE_ALERT_ENTRY && activeTab === 'weather' && appData.alerts.hasActiveAlarm ? (
          <Pressable accessibilityRole="button" accessibilityLabel="開啟即時警報" onPress={openAlarmModal} style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: Math.max(110, insets.bottom + 88), zIndex: 20, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 999, borderWidth: 1, borderColor: '#FEF2F2', backgroundColor: '#FFFFFF', boxShadow: '0 6px 16px rgba(0,0,0,0.12)', transform: [{ scale: pressed ? 0.9 : 1 }] })}>
            <WeatherIcon name="alert-triangle" size={24} strokeWidth={2.5} color="#EF4444" />
            <View style={{ position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 999, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#EF4444' }} />
          </Pressable>
        ) : null}

        <BottomNavigation activeTab={activeTab} onChange={setActiveTab} />
        <AqiDrawer open={isAqiDrawerOpen} data={appData} onClose={closeAqiDrawer} />
        <FavoritesSidebar open={isSidebarOpen} data={appData} favorites={favoriteLocations} onClose={closeSidebar} onSelectLocation={selectLocation} onUseCurrentLocation={useCurrentLocation} onRemoveFavorite={removeFavorite} onSettings={showSettings} />
        <AlarmModal open={isAlarmModalOpen} alert={appData.alerts} onClose={closeAlarmModal} />
        {ENABLE_IWESR ? <SceneQualityModal open={isSceneQualityOpen} value={sceneQualityPreference} onChange={setSceneQualityPreference} onClose={() => setIsSceneQualityOpen(false)} /> : null}
        <TestNotificationModal
          open={isTestNotificationOpen}
          onClose={() => setIsTestNotificationOpen(false)}
          onAlertReceived={(title, body) => {
            setAppData((previous) => ({ ...previous, alerts: { hasActiveAlarm: true, title, content: body } }));
            setIsAlarmModalOpen(true);
          }}
        />
      </View>
    </View>
  );
}
