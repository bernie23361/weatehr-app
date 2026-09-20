import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Appearance, AppState, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { DarkModeNotice } from '@/components/overlays/dark-mode-notice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AqiDrawer } from '@/components/overlays/aqi-drawer';
import { AlarmModal } from '@/components/overlays/alarm-modal';
import { WebAlertToast } from '@/components/overlays/web-alert-toast';
import { FavoritesSidebar } from '@/components/overlays/favorites-sidebar';
import { SceneQualityModal } from '@/components/overlays/scene-quality-modal';
import { BottomNavigation } from '@/components/bottom-navigation';
import { DisasterAmbientGlow } from '@/components/disaster-ambient-glow';
import { TopHeader } from '@/components/top-header';
import { WeatherIcon } from '@/components/weather-icon';
import { DisasterPreparednessScreen } from '@/screens/disaster-preparedness-screen';
import { HumanDisasterResponseScreen } from '@/screens/human-disaster-response-screen';
import { EarthquakeResponseScreen } from '@/screens/earthquake-response-screen';
import { TyphoonResponseScreen } from '@/screens/typhoon-response-screen';
import { SwipeBackView } from '@/components/swipe-back-view';
import { DisasterMapScreen } from '@/screens/disaster-map-screen';
import { SettingsScreen } from '@/screens/settings-screen';
import { WeatherObservationScreen } from '@/screens/weather-observation-screen';
import { LifeWeatherScreen } from '@/screens/life-weather-screen';
import { AstroSection, HourlyForecastSection, LifeSuggestionsSection, WeatherCard, WeeklyForecastSection } from '@/components/weather-sections';
import { initialAppData, initialHourlyForecast, initialLifeSuggestions, initialWeeklyForecast, pageTitles } from '@/data/weather-data';
import { ENABLE_ALERT_ENTRY, ENABLE_DISASTER_VISUAL_STATE, ENABLE_IWESR } from '@/config/features';
import { weatherApi, type CurrentWeatherObservation } from '@/services/weather-api';
import { getCurrentTaiwanLocation, LocationServiceError } from '@/services/location-service';
import { subscribeToAlertResponses } from '@/services/notification-service';
import { defaultAppSettings, loadAppSettings, saveAppSettings, type AppSettings } from '@/services/app-settings';
import { loadFavoriteLocations, saveFavoriteLocations } from '@/services/favorite-locations';
import { setThemeRuntimeDark } from '@/services/theme-runtime';
import { weatherObservationToSceneInput } from '@/src/weather-scene/adapters/weather-observation-to-scene-input';
import type { SceneQualityPreference } from '@/src/weather-scene/types';
import type { AppTab, TaiwanLocation, WeeklyPeriod } from '@/types/weather';

import type { WeatherStat } from '@/data/weather-stat-details';

const placeholderIcons: Partial<Record<AppTab, 'eye' | 'megaphone' | 'user' | 'map'>> = {
  observe: 'eye', warning: 'megaphone', profile: 'user', map: 'map',
};

const INITIAL_COORDINATES = { latitude: 24.158, longitude: 120.683 };

export function WeatherHomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AppTab>('weather');
  const [isHumanDisasterOpen, setIsHumanDisasterOpen] = useState(false);
  const [isEarthquakeOpen, setIsEarthquakeOpen] = useState(false);
  const [isTyphoonOpen, setIsTyphoonOpen] = useState(false);
  const [isLifeWeatherOpen, setIsLifeWeatherOpen] = useState(false);
  const [weeklyTab, setWeeklyTab] = useState<WeeklyPeriod>('day');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState<TaiwanLocation[]>([]);
  const [drawerMetric, setDrawerMetric] = useState<WeatherStat>();
  const [isAqiDrawerOpen, setIsAqiDrawerOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isWebAlertToastVisible, setIsWebAlertToastVisible] = useState(false);
  const [appData, setAppData] = useState(initialAppData);
  const [hourlyForecast, setHourlyForecast] = useState(initialHourlyForecast);
  const [weeklyForecast, setWeeklyForecast] = useState(initialWeeklyForecast);
  const [lifeSuggestions, setLifeSuggestions] = useState(initialLifeSuggestions);
  const [weatherObservation, setWeatherObservation] = useState<CurrentWeatherObservation>();
  const [sceneQualityPreference, setSceneQualityPreference] = useState<SceneQualityPreference>('auto');
  const [isSceneQualityOpen, setIsSceneQualityOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [darkModeNoticeVisible, setDarkModeNoticeVisible] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  useEffect(() => {
    const getAutoPeriod = (): WeeklyPeriod => {
      const h = new Date().getHours();
      return h >= 6 && h < 18 ? 'day' : 'night';
    };

    setWeeklyTab(getAutoPeriod());

    let lastAuto = getAutoPeriod();
    const id = setInterval(() => {
      const auto = getAutoPeriod();
      if (auto !== lastAuto) {
        lastAuto = auto;
        setWeeklyTab(auto);
      }
    }, 30000);

    return () => clearInterval(id);
  }, []);

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
      if (current.hourly?.length) setHourlyForecast(current.hourly);
      void weatherApi.getWeeklyForecast(location).then((weekly) => {
        if (weekly?.length && requestId === weatherRequestId.current) setWeeklyForecast(weekly);
      }).catch(() => {
        // 一週預報暫時失敗時保留上一筆資料，不影響即時天氣。
      });
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
      const [srdi, astro, alerts, suggestions] = await Promise.all([
        weatherApi.getSRDI(), weatherApi.getAstroData(),
        weatherApi.getAlerts(), weatherApi.getLifeSuggestions(),
      ]);
      if (srdi || astro || alerts) {
        setAppData((previous) => ({
          ...previous,
          srdi: srdi?.level ?? previous.srdi,
          astro: { ...previous.astro, ...astro },
          alerts: { ...previous.alerts, ...alerts },
        }));
      }
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
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [fetchApiData, refreshCurrentWeather]);

  useEffect(() => {
    void loadAppSettings().then((settings) => {
      const needsConfirmation = settings.appearanceMode === 'dark' || Appearance.getColorScheme() === 'dark';
      setAppSettings({ ...settings, appearanceMode: 'light' });
      setDarkModeNoticeVisible(needsConfirmation);
      setSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    const requestSystemDarkMode = () => {
      if (Appearance.getColorScheme() === 'dark' && appSettings.appearanceMode !== 'dark') {
        setDarkModeNoticeVisible(true);
      }
    };
    let previousState = AppState.currentState;
    const stateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && previousState !== 'active') requestSystemDarkMode();
      previousState = state;
    });
    const appearanceSubscription = Appearance.addChangeListener(() => {
      if (AppState.currentState === 'active') requestSystemDarkMode();
    });
    return () => { stateSubscription.remove(); appearanceSubscription.remove(); };
  }, [settingsLoaded, appSettings.appearanceMode]);

  useEffect(() => {
    void loadFavoriteLocations().then(setFavoriteLocations);
  }, []);

  useEffect(() => {
    if (!settingsLoaded || !appSettings.autoRefreshWeather) return;
    const refreshActiveTarget = () => {
      const target = weatherTarget.current;
      void refreshCurrentWeather(target.coordinates, target.location);
    };
    const interval = setInterval(refreshActiveTarget, appSettings.refreshIntervalMinutes * 60_000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      const staleAfter = appSettings.refreshIntervalMinutes * 60_000;
      if (state === 'active' && Date.now() - lastWeatherUpdateAt.current >= staleAfter) refreshActiveTarget();
    });
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [appSettings.autoRefreshWeather, appSettings.refreshIntervalMinutes, refreshCurrentWeather, settingsLoaded]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return subscribeToAlertResponses(({ title, content }) => {
      setAppData((previous) => ({ ...previous, alerts: { hasActiveAlarm: true, title, content } }));
      setIsAlarmModalOpen(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !appData.alerts.hasActiveAlarm) return;
    setIsWebAlertToastVisible(true);
    const timer = setTimeout(() => setIsWebAlertToastVisible(false), 8_000);
    return () => clearTimeout(timer);
  }, [appData.alerts.content, appData.alerts.hasActiveAlarm, appData.alerts.title]);

  const reducedMotion = systemReducedMotion || appSettings.reduceMotion;
  const isDisasterVisualActive = ENABLE_DISASTER_VISUAL_STATE;
  const dark = appSettings.appearanceMode === 'dark';
  setThemeRuntimeDark(dark);
  const sceneInput = useMemo(() => ENABLE_IWESR && weatherObservation ? weatherObservationToSceneInput(weatherObservation, appData, sceneQualityPreference, reducedMotion) : undefined, [appData, reducedMotion, sceneQualityPreference, weatherObservation]);
  const placeholderIcon = placeholderIcons[activeTab];
  const currentLocation: TaiwanLocation = { id: `${appData.location.city}-${appData.location.district}`, city: appData.location.city, district: appData.location.district };
  const isFavorite = favoriteLocations.some((location) => location.id === currentLocation.id);

  const toggleCurrentFavorite = useCallback(() => {
    setFavoriteLocations((previous) => {
      const next = isFavorite
        ? previous.filter((location) => location.id !== currentLocation.id)
        : [...previous, currentLocation];
      void saveFavoriteLocations(next).catch(() => {
        Alert.alert('無法儲存收藏', '收藏已套用於本次使用，但目前無法保存到裝置。');
      });
      return next;
    });
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
      const located = await getCurrentTaiwanLocation(currentLocation);
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
    setActiveTab('settings');
  }, []);

  const changeSettings = useCallback((settings: AppSettings) => {
    if (settings.appearanceMode === 'dark' && appSettings.appearanceMode !== 'dark') {
      setDarkModeNoticeVisible(true);
      return;
    }
    persistSettings(settings);
  }, [appSettings.appearanceMode]);

  function persistSettings(settings: AppSettings) {
    setAppSettings(settings);
    void saveAppSettings(settings).catch(() => {
      Alert.alert('無法儲存設定', '設定已套用於本次使用，但目前無法保存到裝置。');
    });
  }

  const resolveDarkModeNotice = (confirmed: boolean) => {
    setDarkModeNoticeVisible(false);
    persistSettings({ ...appSettings, appearanceMode: confirmed ? 'dark' : 'light' });
  };

  const openAqiDrawer = useCallback(() => { setDrawerMetric(undefined); setIsAqiDrawerOpen(true); }, []);
  const openWeatherStat = useCallback((metric: WeatherStat) => { setDrawerMetric(metric); setIsAqiDrawerOpen(true); }, []);
  const closeAqiDrawer = useCallback(() => setIsAqiDrawerOpen(false), []);
  const closeAlarmModal = useCallback(() => setIsAlarmModalOpen(false), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const openMap = useCallback(() => setActiveTab('map'), []);
  const openAlarmModal = useCallback(() => setIsAlarmModalOpen(true), []);
  const openLifeWeather = useCallback(() => setIsLifeWeatherOpen(true), []);
  const closeLifeWeather = useCallback(() => setIsLifeWeatherOpen(false), []);
  const removeFavorite = useCallback((location: TaiwanLocation) => {
    setFavoriteLocations((previous) => {
      const next = previous.filter((item) => item.id !== location.id);
      void saveFavoriteLocations(next).catch(() => {
        Alert.alert('無法儲存收藏', '收藏已套用於本次使用，但目前無法保存到裝置。');
      });
      return next;
    });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: dark ? '#020617' : '#F1F5F9' }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <DarkModeNotice visible={darkModeNoticeVisible} reducedMotion={reducedMotion} onCancel={() => resolveDarkModeNotice(false)} onConfirm={() => resolveDarkModeNotice(true)} />
      <View style={{ width: Math.min(width, 430), flex: 1, overflow: 'hidden', backgroundColor: dark ? '#0B1120' : '#F4F7F9' }}>
        {activeTab === 'weather' && isDisasterVisualActive ? <DisasterAmbientGlow reducedMotion={reducedMotion} /> : null}
        {isHumanDisasterOpen || isEarthquakeOpen || isTyphoonOpen || isLifeWeatherOpen ? null : <TopHeader title={pageTitles[activeTab]} onOpenMap={openMap} onOpenSidebar={openSidebar} dark={dark} />}
        {isHumanDisasterOpen ? (
          <SwipeBackView onBack={() => setIsHumanDisasterOpen(false)}>
            <HumanDisasterResponseScreen onBack={() => setIsHumanDisasterOpen(false)} />
          </SwipeBackView>
        ) : isEarthquakeOpen ? (
          <SwipeBackView onBack={() => setIsEarthquakeOpen(false)}>
            <EarthquakeResponseScreen onBack={() => setIsEarthquakeOpen(false)} />
          </SwipeBackView>
        ) : isTyphoonOpen ? (
          <SwipeBackView onBack={() => setIsTyphoonOpen(false)}>
            <TyphoonResponseScreen onBack={() => setIsTyphoonOpen(false)} />
          </SwipeBackView>
        ) : isLifeWeatherOpen ? (
          <SwipeBackView onBack={closeLifeWeather}>
            <LifeWeatherScreen onBack={closeLifeWeather} data={appData} observation={weatherObservation} hourlyForecast={hourlyForecast} vehicle={appSettings.vehicleType} />
          </SwipeBackView>
        ) : activeTab === 'weather' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 + insets.bottom, gap: 16 }}>
            <WeatherCard data={appData} isFavorite={isFavorite} onToggleFavorite={toggleCurrentFavorite} onOpenAqi={openAqiDrawer} onOpenWeatherStat={openWeatherStat} isDisasterVisualActive={isDisasterVisualActive} sceneInput={sceneInput} labelTone={appSettings.statLabelTone} />
            <LifeSuggestionsSection suggestions={lifeSuggestions} data={appData} onOpenLifeWeather={openLifeWeather} />
            <HourlyForecastSection forecast={hourlyForecast} />
            <WeeklyForecastSection forecast={weeklyForecast} period={weeklyTab} onChangePeriod={setWeeklyTab} />
            <AstroSection data={appData.astro} />
            <Text style={{ alignSelf: 'center', color: '#94A3B8', fontSize: 13, fontWeight: '600', letterSpacing: 0.2, marginTop: 2 }}>
              天氣概況Weather
            </Text>
          </ScrollView>
        ) : activeTab === 'observe' ? (
          <WeatherObservationScreen bottomInset={insets.bottom} anchor={weatherTarget.current.coordinates} />
        ) : activeTab === 'warning' ? (
          <DisasterMapScreen bottomInset={insets.bottom} />
        ) : activeTab === 'map' ? (
          <DisasterPreparednessScreen bottomInset={insets.bottom} onOpenHumanDisaster={() => setIsHumanDisasterOpen(true)} onOpenEarthquake={() => setIsEarthquakeOpen(true)} onOpenTyphoon={() => setIsTyphoonOpen(true)} />
        ) : activeTab === 'settings' ? (
          <SettingsScreen value={appSettings} onChange={changeSettings} />
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

        {isHumanDisasterOpen || isEarthquakeOpen || isTyphoonOpen || isLifeWeatherOpen ? null : <BottomNavigation activeTab={activeTab} onChange={setActiveTab} dark={dark} />}
        <WebAlertToast
          alert={appData.alerts}
          visible={isWebAlertToastVisible}
          onClose={() => setIsWebAlertToastVisible(false)}
          onPress={() => { setIsWebAlertToastVisible(false); setIsAlarmModalOpen(true); }}
        />
        <AqiDrawer metric={drawerMetric} open={isAqiDrawerOpen} data={appData} onClose={closeAqiDrawer} />
        <FavoritesSidebar open={isSidebarOpen} data={appData} favorites={favoriteLocations} onClose={closeSidebar} onSelectLocation={selectLocation} onUseCurrentLocation={useCurrentLocation} onRemoveFavorite={removeFavorite} onSettings={showSettings} />
        <AlarmModal open={isAlarmModalOpen} alert={appData.alerts} onClose={closeAlarmModal} />
        {ENABLE_IWESR ? <SceneQualityModal open={isSceneQualityOpen} value={sceneQualityPreference} onChange={setSceneQualityPreference} onClose={() => setIsSceneQualityOpen(false)} /> : null}
      </View>
    </View>
  );
}
