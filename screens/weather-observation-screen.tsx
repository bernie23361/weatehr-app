import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { getMapLibreModule, TaiwanMap, type MapViewport } from '@/components/taiwan-map';
import { WeatherIcon } from '@/components/weather-icon';
import { resolveWeatherConditionIcon } from '@/data/weather-icon-mapping';
import { resolveFeelsLikeStatus } from '@/data/weather-stat-status';
import { taiwanHighwayCenterlines } from '@/data/taiwan-highway-centerlines';
import { taiwanIslands } from '@/data/taiwan-islands';
import { unprojectCoordinates } from '@/data/taiwan-map-projection';
import { RADAR_BOUNDS, radarImageUrl } from '@/config/radar';
import { TEMPERATURE_BOUNDS, TEMPERATURE_COLOR_STOPS, TEMPERATURE_GRID_REQUESTS_ENABLED, TEMPERATURE_MAX, TEMPERATURE_MIN, temperatureColor, temperatureGridImageUrl, temperatureGridMetadataUrl } from '@/config/temperature-grid';
import { weatherApi, type Coordinates, type ObservationStation } from '@/services/weather-api';

type ObservationLayer = 'radar' | 'temperature' | 'rainfall' | 'wind' | 'humidity' | 'visibility' | 'highways';

const layerOrder: ObservationLayer[] = ['radar', 'temperature', 'rainfall', 'wind', 'humidity', 'visibility', 'highways'];

const HIGHWAY_FILL_COLOR = '#9CA3AF';
const HIGHWAY_BORDER_COLOR = '#4B5563';

const temperatureGradientStops: ColorStop[] = TEMPERATURE_COLOR_STOPS
  .filter((stop, index, stops) => index === 0 || stop.color !== stops[index - 1].color)
  .map((stop) => ({
    pos: Math.min(1, Math.max(0, (stop.temperature - TEMPERATURE_MIN) / (TEMPERATURE_MAX - TEMPERATURE_MIN || 1))),
    color: stop.color,
  }));

interface ColorStop {
  pos: number;
  color: string;
}

interface LayerDef {
  label: string;
  title: string;
  unit?: string;
  min?: number;
  max?: number;
  stops?: ColorStop[];
  colorsStations: boolean;
  hasLegend: boolean;
}

const layerConfig: Record<ObservationLayer, LayerDef> = {
  radar: { label: '雷達', title: '降雨雷達', colorsStations: false, hasLegend: false },
  temperature: {
    label: '溫度',
    title: '溫度觀測',
    unit: '°C',
    min: TEMPERATURE_MIN,
    max: TEMPERATURE_MAX,
    stops: temperatureGradientStops,
    colorsStations: true,
    hasLegend: true,
  },
  rainfall: {
    label: '雨量',
    title: '雨量觀測',
    unit: 'mm',
    min: 0,
    max: 30,
    stops: [
      { pos: 0, color: '#E0F2FE' },
      { pos: 1, color: '#0369A1' },
    ],
    colorsStations: true,
    hasLegend: true,
  },
  wind: {
    label: '風力',
    title: '風力觀測',
    unit: 'm/s',
    min: 0,
    max: 15,
    stops: [
      { pos: 0, color: '#BAE6FD' },
      { pos: 1, color: '#0E7490' },
    ],
    colorsStations: true,
    hasLegend: true,
  },
  humidity: {
    label: '濕度',
    title: '濕度觀測',
    unit: '%',
    min: 0,
    max: 100,
    stops: [
      { pos: 0, color: '#F59E0B' },
      { pos: 0.45, color: '#4ADE80' },
      { pos: 1, color: '#3B82F6' },
    ],
    colorsStations: true,
    hasLegend: true,
  },
  visibility: {
    label: '能見度',
    title: '能見度觀測',
    unit: 'km',
    min: 0,
    max: 40,
    stops: [
      { pos: 0, color: '#EF4444' },
      { pos: 0.35, color: '#FACC15' },
      { pos: 1, color: '#22C55E' },
    ],
    colorsStations: true,
    hasLegend: true,
  },
  highways: { label: '公路', title: '公路天氣', colorsStations: false, hasLegend: false },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const pad = (n: number) => String(n).padStart(2, '0');

const formatObservedAt = (value: string | null): string => {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const distanceKm = (latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDistance = radians(latitudeB - latitudeA);
  const longitudeDistance = radians(longitudeB - longitudeA);
  const a = Math.sin(latitudeDistance / 2) ** 2 + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(longitudeDistance / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const lerpColor = (colorA: string, colorB: string, progress: number): string => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * progress);
  return `#${[channel(0), channel(1), channel(2)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

function stationLayerValue(station: ObservationStation, layer: ObservationLayer): number | null {
  switch (layer) {
    case 'temperature': return station.temperature;
    case 'rainfall': return station.precipitationIntensity;
    case 'wind': return station.windSpeedMs;
    case 'humidity': return station.humidity;
    case 'visibility': return station.visibilityKm;
    default: return null;
  }
}

function primaryValue(station: ObservationStation, layer: ObservationLayer): number | null {
  return stationLayerValue(station, layer) ?? station.temperature;
}

function primaryUnit(layer: ObservationLayer): string {
  return layerConfig[layer].unit ?? '°C';
}

function layerColor(layer: ObservationLayer, value: number | null): string {
  const config = layerConfig[layer];
  if (!config.stops || value == null || !Number.isFinite(value)) return '#CBD5E1';
  if (layer === 'temperature') {
    return temperatureColor(value);
  }
  const min = config.min ?? 0;
  const max = config.max ?? 1;
  const t = clamp((value - min) / (max - min || 1), 0, 1);
  const stops = config.stops;
  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];
    if (t <= end.pos) {
      const local = (t - start.pos) / (end.pos - start.pos || 1);
      return lerpColor(start.color, end.color, clamp(local, 0, 1));
    }
  }
  return stops[stops.length - 1].color;
}

const DEFAULT_ANCHOR: Coordinates = { latitude: 24.1469, longitude: 120.6839 };
const OBSERVATION_INITIAL_BOUNDS: [number, number, number, number] = [119.0, 21.75, 122.1, 25.55];
const OBSERVATION_INITIAL_PADDING = { top: 18, right: 28, bottom: 28, left: 10 };
const TEMPERATURE_MASK_PADDING = 0.08;
const TEMPERATURE_STATION_LABEL_SHOW_ZOOM = 9.6;
const TEMPERATURE_STATION_LABEL_HIDE_ZOOM = 9.1;
const TEMPERATURE_STATION_VIEWPORT_PADDING = 0.12;

const GPS_LOCATION_PATH = 'M2.89945 2.29983L21.7052 8.56842C21.9672 8.65574 22.1088 8.93891 22.0215 9.20088C21.975 9.3404 21.8694 9.45238 21.7328 9.507L13.0002 13.0001L8.57501 21.8504C8.45151 22.0974 8.15118 22.1975 7.90419 22.074C7.77883 22.0113 7.68553 21.8989 7.64703 21.7641L2.26058 2.91153C2.18472 2.64601 2.33846 2.36927 2.60398 2.29341C2.70087 2.26573 2.80386 2.26796 2.89945 2.29983Z';
const GPS_LOCATION_SIZE = 13;
const GPS_LOCATION_HALO_SCALE = 1.25;

function svgPathToLngLatRings(path: string): [number, number][][] {
  const tokens = path.match(/[MLZ]|-?\d+(?:\.\d+)?/gi) ?? [];
  const rings: [number, number][][] = [];
  let ring: [number, number][] = [];

  for (let index = 0; index < tokens.length;) {
    const token = tokens[index++];
    if (token === 'M' || token === 'L') {
      const x = Number(tokens[index++]);
      const y = Number(tokens[index++]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const { latitude, longitude } = unprojectCoordinates({ x, y });
      ring.push([longitude, latitude]);
    } else if (token === 'Z') {
      if (ring.length >= 3) rings.push([...ring, ring[0]]);
      ring = [];
    }
  }

  if (ring.length >= 3) rings.push([...ring, ring[0]]);
  return rings;
}

function signedRingArea(ring: [number, number][]) {
  return ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function orientRing(ring: [number, number][], clockwise: boolean): [number, number][] {
  const isClockwise = signedRingArea(ring) < 0;
  return isClockwise === clockwise ? ring : [...ring].reverse();
}

function temperatureSeaMaskGeoJson(): GeoJSON.FeatureCollection {
  const lonMin = Math.min(TEMPERATURE_BOUNDS.topLeft[0], TEMPERATURE_BOUNDS.bottomLeft[0]) - TEMPERATURE_MASK_PADDING;
  const lonMax = Math.max(TEMPERATURE_BOUNDS.topRight[0], TEMPERATURE_BOUNDS.bottomRight[0]) + TEMPERATURE_MASK_PADDING;
  const latMin = Math.min(TEMPERATURE_BOUNDS.bottomLeft[1], TEMPERATURE_BOUNDS.bottomRight[1]) - TEMPERATURE_MASK_PADDING;
  const latMax = Math.max(TEMPERATURE_BOUNDS.topLeft[1], TEMPERATURE_BOUNDS.topRight[1]) + TEMPERATURE_MASK_PADDING;
  const outerRing: [number, number][] = [
    [lonMin, latMax],
    [lonMin, latMin],
    [lonMax, latMin],
    [lonMax, latMax],
    [lonMin, latMax],
  ];
  const islandRings = taiwanIslands
    .flatMap((island) => svgPathToLngLatRings(island.d))
    .map((ring) => orientRing(ring, true));

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [orientRing(outerRing, false), ...islandRings] },
      properties: {},
    }],
  };
}

const temperatureMaskGeoJson = temperatureSeaMaskGeoJson();

interface WeatherObservationScreenProps {
  bottomInset: number;
  anchor?: Coordinates;
}

export function WeatherObservationScreen({ bottomInset, anchor }: WeatherObservationScreenProps) {
  const [stations, setStations] = useState<ObservationStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const [layer, setLayer] = useState<ObservationLayer>('temperature');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isStationPanelVisible, setIsStationPanelVisible] = useState(true);
  const [temperatureObservedAt, setTemperatureObservedAt] = useState('');
  const [showTemperatureLabels, setShowTemperatureLabels] = useState(false);
  const [visibleMapBounds, setVisibleMapBounds] = useState<MapViewport['bounds']>();

  const anchorPoint = anchor ?? DEFAULT_ANCHOR;

  const loadStations = useCallback(async () => {
    try {
      const result = await weatherApi.getObservationStations();
      if (!result) return;
      setStations(result);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStations();
    const refreshTimer = setInterval(() => void loadStations(), 5 * 60 * 1000);
    return () => clearInterval(refreshTimer);
  }, [loadStations]);

  useEffect(() => {
    if (!TEMPERATURE_GRID_REQUESTS_ENABLED) return undefined;

    const controller = new AbortController();
    const loadTemperatureMetadata = async () => {
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch(temperatureGridMetadataUrl(), { signal: controller.signal });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (
          typeof payload === 'object'
          && payload !== null
          && 'time' in payload
          && typeof payload.time === 'string'
          && Number.isFinite(Date.parse(payload.time))
        ) {
          setTemperatureObservedAt(payload.time);
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.warn('Failed to load temperature Worker metadata');
        }
      } finally {
        clearTimeout(timeout);
      }
    };
    void loadTemperatureMetadata();
    const timer = setInterval(() => void loadTemperatureMetadata(), 10 * 60 * 1000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);

  const withCoordinates = useMemo(() => stations.filter((station) => station.latitude != null && station.longitude != null), [stations]);

  const selected = useMemo(() => {
    if (!withCoordinates.length) return undefined;
    if (selectedId) {
      const matched = stations.find((station) => station.stationId === selectedId);
      if (matched) return matched;
    }
    return withCoordinates.reduce((nearest, station) => {
      const distance = distanceKm(anchorPoint.latitude, anchorPoint.longitude, station.latitude!, station.longitude!);
      return distance < nearest.distance ? { station, distance } : nearest;
    }, { station: withCoordinates[0], distance: Infinity }).station;
  }, [anchorPoint, selectedId, stations, withCoordinates]);

  const radarUrl = useMemo(() => radarImageUrl(), []);

  const dataVersion = temperatureObservedAt;

  const observationDate = useMemo(() => {
    const observedAt = layer === 'temperature' && dataVersion ? dataVersion : selected?.observedAt;
    if (!observedAt) return null;
    const date = new Date(observedAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [dataVersion, layer, selected?.observedAt]);

  const temperatureGridUrl = useMemo(() => (
    TEMPERATURE_GRID_REQUESTS_ENABLED ? temperatureGridImageUrl() : null
  ), []);
  const visibleTemperatureStations = useMemo(() => {
    if (!visibleMapBounds) return [];
    const [west, south, east, north] = visibleMapBounds;
    const longitudePadding = (east - west) * TEMPERATURE_STATION_VIEWPORT_PADDING;
    const latitudePadding = (north - south) * TEMPERATURE_STATION_VIEWPORT_PADDING;
    return withCoordinates.filter((station) => (
      station.temperature != null
      && station.longitude! >= west - longitudePadding
      && station.longitude! <= east + longitudePadding
      && station.latitude! >= south - latitudePadding
      && station.latitude! <= north + latitudePadding
    ));
  }, [visibleMapBounds, withCoordinates]);

  const handleMapRegionDidChange = useCallback(({ zoom, bounds }: MapViewport) => {
    setVisibleMapBounds(bounds);
    setShowTemperatureLabels((visible) => {
      if (zoom >= TEMPERATURE_STATION_LABEL_SHOW_ZOOM) return true;
      if (zoom <= TEMPERATURE_STATION_LABEL_HIDE_ZOOM) return false;
      return visible;
    });
  }, []);

  const stationGeoJson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: withCoordinates.map((station) => {
      const value = stationLayerValue(station, layer);
      const isSelected = selected?.stationId === station.stationId;
      const colored = layerConfig[layer].colorsStations;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [station.longitude!, station.latitude!] },
        properties: {
          stationId: station.stationId,
          color: colored ? layerColor(layer, value) : '#CBD5E1',
          opacity: colored ? (value == null ? 0.35 : 0.92) : 0.65,
          radius: isSelected ? 6 : 4,
          strokeWidth: isSelected ? 2 : 0,
        },
      };
    }),
  }), [layer, selected?.stationId, withCoordinates]);

  const highwayGeoJson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: taiwanHighwayCenterlines.features,
  }), []);

  const dateText = observationDate
    ? `${observationDate.getFullYear()}-${pad(observationDate.getMonth() + 1)}-${pad(observationDate.getDate())}`
    : '---- -- --';
  const timeText = observationDate
    ? `${pad(observationDate.getHours())}:${pad(observationDate.getMinutes())}:${pad(observationDate.getSeconds())}`
    : '--:--:--';

  const overlay = useMemo(() => (
    () => {
      const mapLibre = getMapLibreModule();
      if (!mapLibre) return null;

      const { GeoJSONSource, ImageSource, Layer } = mapLibre;

      return (
        <>
      {layer === 'radar' ? (
        <ImageSource
          key="radar-source"
          id="radar-source"
          url={radarUrl}
          coordinates={[
            [RADAR_BOUNDS.lonMin, RADAR_BOUNDS.latMax],
            [RADAR_BOUNDS.lonMax, RADAR_BOUNDS.latMax],
            [RADAR_BOUNDS.lonMax, RADAR_BOUNDS.latMin],
            [RADAR_BOUNDS.lonMin, RADAR_BOUNDS.latMin],
          ]}
        >
          <Layer id="radar-layer" type="raster" beforeId="town-outline" paint={{ 'raster-opacity': 0.88 }} />
        </ImageSource>
      ) : null}
      {layer === 'temperature' && temperatureGridUrl ? (
        <ImageSource
          key="temperature-grid-source"
          id="temperature-grid-source"
          url={temperatureGridUrl}
          coordinates={[
            TEMPERATURE_BOUNDS.topLeft,
            TEMPERATURE_BOUNDS.topRight,
            TEMPERATURE_BOUNDS.bottomRight,
            TEMPERATURE_BOUNDS.bottomLeft,
          ]}
        >
          <Layer
            id="temperature-grid-layer"
            type="raster"
            beforeId="town-outline"
            paint={{ 'raster-opacity': 0.86, 'raster-resampling': 'linear' }}
          />
        </ImageSource>
      ) : null}
      {layer === 'temperature' && temperatureGridUrl ? (
        <GeoJSONSource key="temperature-mask-source" id="temperature-mask-source" data={temperatureMaskGeoJson}>
          <Layer
            id="temperature-sea-mask"
            type="fill"
            beforeId="town-outline"
            paint={{ 'fill-color': '#E8F0F8', 'fill-opacity': 1 }}
          />
        </GeoJSONSource>
      ) : null}
      {layer === 'highways' ? (
        <GeoJSONSource key="highways-source" id="highways-source" data={highwayGeoJson}>
          <Layer
            id="national-highways-border"
            type="line"
            filter={['==', ['get', 'type'], 'national']}
            paint={{
              'line-color': HIGHWAY_BORDER_COLOR,
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4.8, 16, 9],
              'line-opacity': 0.96,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          <Layer
            id="national-highways-left-fill"
            type="line"
            filter={['==', ['get', 'type'], 'national']}
            paint={{
              'line-color': HIGHWAY_FILL_COLOR,
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.7, 16, 3.6],
              'line-offset': ['interpolate', ['linear'], ['zoom'], 8, -1, 16, -2],
              'line-opacity': 1,
            }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
          <Layer
            id="national-highways-right-fill"
            type="line"
            filter={['==', ['get', 'type'], 'national']}
            paint={{
              'line-color': HIGHWAY_FILL_COLOR,
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.7, 16, 3.6],
              'line-offset': ['interpolate', ['linear'], ['zoom'], 8, 1, 16, 2],
              'line-opacity': 1,
            }}
layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
      ) : null}
      <GeoJSONSource
        key="stations-source"
        id="stations-source"
        data={stationGeoJson}
        onPress={(event: any) => {
          const stationId = event.nativeEvent.features[0]?.properties?.stationId;
          if (typeof stationId === 'string') {
            setSelectedId(stationId);
            setIsStationPanelVisible(true);
          }
        }}
      >
        {layer === 'temperature' ? null : (
          <Layer
            id="station-points"
            type="circle"
            afterId="town-outline"
            paint={{
              'circle-radius': ['get', 'radius'],
              'circle-color': ['get', 'color'],
              'circle-opacity': ['get', 'opacity'],
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': ['get', 'strokeWidth'],
            }}
          />
        )}
      </GeoJSONSource>
        </>
      );
    }
  )(), [highwayGeoJson, layer, radarUrl, stationGeoJson, temperatureGridUrl]);

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#E8F0F8' }}>
      <TaiwanMap allowTap initialBounds={OBSERVATION_INITIAL_BOUNDS} initialPadding={OBSERVATION_INITIAL_PADDING} onRegionDidChange={handleMapRegionDidChange}>
        <GpsLocationMarker lngLat={[anchorPoint.longitude, anchorPoint.latitude]} size={GPS_LOCATION_SIZE} />
        {overlay}
        {layer === 'temperature' && showTemperatureLabels ? (
          <TemperatureStationLabels
            stations={visibleTemperatureStations}
            selectedId={selected?.stationId}
            onSelect={(stationId) => {
              setSelectedId(stationId);
              setIsStationPanelVisible(true);
            }}
          />
        ) : null}
      </TaiwanMap>

      <View pointerEvents="none" style={{ position: 'absolute', top: 14, left: 16 }}>
        <Text style={{ color: '#1E293B', fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0.2 }}>{layerConfig[layer].title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 2 }}>
          <Text style={{ color: '#1E293B', fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 0.2 }}>{dateText}</Text>
          <Text style={{ color: '#1E293B', fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 0.2 }}>{timeText}</Text>
        </View>
        {layer === 'temperature' ? (
          <Text style={{ color: '#64748B', fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 2 }}>
            {temperatureGridUrl && stations.length ? '格點與測站觀測' : temperatureGridUrl ? '格點觀測' : '測站觀測'}
          </Text>
        ) : null}
      </View>

      <View style={{ position: 'absolute', top: 14, right: 16, zIndex: 30, alignItems: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="選擇觀測圖層"
          accessibilityState={{ expanded: isLayerMenuOpen }}
          onPress={() => setIsLayerMenuOpen((open) => !open)}
          style={({ pressed }) => ({
            minWidth: 78,
            height: 32,
            paddingHorizontal: 11,
            borderRadius: 11,
            borderWidth: 1,
            borderColor: '#D9E3ED',
            backgroundColor: pressed ? 'rgba(241,245,249,0.96)' : 'rgba(255,255,255,0.92)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          })}
        >
          <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700' }}>{layerConfig[layer].label}</Text>
          <Svg width={10} height={6} viewBox="0 0 10 6">
            <Path
              d={isLayerMenuOpen ? 'M1 5L5 1L9 5' : 'M1 1L5 5L9 1'}
              fill="none"
              stroke="#94A3B8"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        {isLayerMenuOpen ? (
          <View style={{ width: 104, marginTop: 5, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D9E3ED', backgroundColor: 'rgba(255,255,255,0.97)', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
            {layerOrder.map((option) => {
              const selected = option === layer;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setLayer(option);
                    setIsLayerMenuOpen(false);
                  }}
                  style={({ pressed }) => ({
                    height: 32,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    backgroundColor: selected ? '#EAF4FF' : pressed ? '#F8FAFC' : 'transparent',
                  })}
                >
                  <Text style={{ color: selected ? '#1677D2' : '#64748B', fontSize: 12, fontWeight: selected ? '700' : '600' }}>
                    {layerConfig[option].label}
                  </Text>
                  {layerConfig[option].unit ? <Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '500' }}>{layerConfig[option].unit}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View pointerEvents="none" style={{ position: 'absolute', top: 96, left: 16, right: 16 }}>
        {layer === 'highways' ? (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#EEF2F6' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 16, height: 4, borderRadius: 999, backgroundColor: '#374151' }} />
              <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}>國道</Text>
            </View>
          </View>
        ) : layer === 'radar' ? (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: '#EEF2F6' }}>
            <WeatherIcon name="cloud-rain" size={11} color="#64748B" />
            <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600' }}>雷達回波圖</Text>
          </View>
        ) : null}
      </View>

      {layerConfig[layer].hasLegend ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 90 + bottomInset }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700', width: 30 }}>{layerConfig[layer].min}</Text>
            <View style={{ flex: 1, height: 8, marginHorizontal: 6, borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF' }}>
              <LinearGradient
                colors={layerConfig[layer].stops!.map((stop) => stop.color) as [string, string, ...string[]]}
                locations={layerConfig[layer].stops!.map((stop) => stop.pos) as [number, number, ...number[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 8 }}
              />
            </View>
            <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right' }}>{layerConfig[layer].max}</Text>
            <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '600', marginLeft: 6, width: 26 }}>{layerConfig[layer].unit}</Text>
          </View>
        </View>
      ) : null}

      {(loading || (selected && isStationPanelVisible)) ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 114 + bottomInset, zIndex: 20 }}>
          <PanelShell>
            {loading ? (
            <View style={{ height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
              <ActivityIndicator color="#94A3B8" />
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>載入測站資料中…</Text>
            </View>
            ) : selected ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9 }}>
              <View style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: primaryValue(selected, layer) != null ? layerColor(layer, primaryValue(selected, layer)) : '#CBD5E1', borderWidth: 2, borderColor: '#FFFFFF' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#1E293B', fontSize: 14, fontWeight: '700' }}>{selected.stationName}</Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>{selected.county}{selected.town}</Text>
              </View>
              <Text style={{ color: '#334155', fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {primaryValue(selected, layer) != null ? Math.round(primaryValue(selected, layer)!) : '--'}<Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '500' }}>{primaryUnit(layer)}</Text>
              </Text>
            </View>
            ) : null}
          </PanelShell>
        </View>
      ) : null}
    </View>
  );
}

function GpsLocationMarker({ lngLat, size }: { lngLat: [number, number]; size: number }) {
  const mapLibre = getMapLibreModule();
  if (!mapLibre) return null;

  const { Marker } = mapLibre;
  const haloSize = size * GPS_LOCATION_HALO_SCALE;

  return (
    <Marker id="anchor-point" lngLat={lngLat}>
      <View style={{ width: haloSize, height: haloSize, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={haloSize} height={haloSize} viewBox="0 0 24 24" style={{ position: 'absolute' }}>
          <Path d={GPS_LOCATION_PATH} fill="#FFFFFF" />
        </Svg>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d={GPS_LOCATION_PATH} fill="#1E293B" />
        </Svg>
      </View>
    </Marker>
  );
}

function TemperatureStationLabels({
  stations,
  selectedId,
  onSelect,
}: {
  stations: ObservationStation[];
  selectedId?: string;
  onSelect: (stationId: string) => void;
}) {
  const mapLibre = getMapLibreModule();
  if (!mapLibre) return null;

  const { Marker } = mapLibre;

  return (
    <>
      {stations.map((station) => {
        if (station.latitude == null || station.longitude == null || station.temperature == null) return null;
        const selected = station.stationId === selectedId;
        const status = resolveFeelsLikeStatus(`${Math.round(station.temperature)}°`);
        return (
          <Marker key={`temperature-${station.stationId}`} id={`temperature-${station.stationId}`} lngLat={[station.longitude, station.latitude]} anchor="center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${station.stationName} ${Math.round(station.temperature)}度`}
              onPress={() => onSelect(station.stationId)}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: status.badgeBg,
                borderWidth: selected ? 2 : 1,
                borderColor: status.badgeText,
                opacity: pressed ? 0.72 : 1,
                boxShadow: selected ? '0 3px 9px rgba(15,23,42,0.18)' : '0 1px 3px rgba(15,23,42,0.10)',
              })}
            >
              <Text style={{ color: status.badgeText, fontSize: 9, lineHeight: 12, fontWeight: '500', fontVariant: ['tabular-nums'] }}>
                {Math.round(station.temperature)}°
              </Text>
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <View style={{ marginHorizontal: 12, borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: '0 -10px 30px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
      {children}
    </View>
  );
}

interface StationDetailProps {
  station: ObservationStation;
  distance?: number;
  layer: ObservationLayer;
  selectedId: string;
  onCollapse: () => void;
  onSelect: (id: string) => void;
  nearby: { station: ObservationStation; distance: number }[];
}

function StationDetail({ station, distance, layer, selectedId, onCollapse, onSelect, nearby }: StationDetailProps) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#4ADE80' }} />
            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600' }}>
              {station.stationName} · {station.county}{station.town}
            </Text>
            {distance != null ? <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '500' }}>{distance < 1 ? '不到 1 km' : `${distance.toFixed(0)} km`}</Text> : null}
          </View>
          <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '700', marginTop: 2 }}>即時觀測 · {formatObservedAt(station.observedAt)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="收合測站面板" onPress={onCollapse} hitSlop={8} style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#F1F5F9' : '#F8FAFC' })}>
          <WeatherIcon name="x" size={15} color="#94A3B8" style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ color: '#1E293B', fontSize: 44, lineHeight: 46, fontWeight: '600', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
            {primaryValue(station, layer) != null ? Math.round(primaryValue(station, layer)!) : '--'}
          </Text>
          <Text style={{ color: '#64748B', fontSize: 18, lineHeight: 22, fontWeight: '400', marginBottom: 3, marginLeft: 2 }}>{primaryUnit(layer)}</Text>
          <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '500', marginLeft: 12, marginBottom: 6 }}>{station.weather || '—'}</Text>
        </View>
        <View style={{ alignItems: 'center', padding: 6, borderRadius: 14, backgroundColor: '#F8FAFC' }}>
          <WeatherIcon name={resolveWeatherConditionIcon(station.weather)} size={28} color="#0057D9" />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}>
        <StatTile label="風速" value={station.windSpeedMs != null ? `${station.windSpeedMs.toFixed(1)} m/s` : '--'} icon="wind" />
        <StatTile label="陣風" value={station.gustSpeedMs != null ? `${station.gustSpeedMs.toFixed(1)} m/s` : '--'} icon="wind" />
        <StatTile label="濕度" value={station.humidity != null ? `${Math.round(station.humidity)}%` : '--'} icon="droplets" />
        <StatTile label="雨量" value={station.precipitationIntensity != null ? `${station.precipitationIntensity.toFixed(1)} mm` : '--'} icon="cloud-rain" />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={{ color: '#1E293B', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>附近測站</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
          {nearby.map(({ station: itemStation, distance: itemDistance }) => {
            const isSelected = itemStation.stationId === selectedId;
            const value = primaryValue(itemStation, layer);
            return (
              <Pressable key={itemStation.stationId} onPress={() => onSelect(itemStation.stationId)} style={({ pressed }) => ({ width: 96, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: isSelected ? '#BFDBFE' : '#EEF2F6', backgroundColor: isSelected ? '#EAF4FF' : pressed ? '#F8FAFC' : '#FFFFFF', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: layerConfig[layer].colorsStations ? layerColor(layer, stationLayerValue(itemStation, layer)) : '#CBD5E1' }} />
                  <Text style={{ flex: 1, color: isSelected ? '#1677D2' : '#475569', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>{itemStation.stationName}</Text>
                </View>
                <Text style={{ color: '#334155', fontSize: 15, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                  {value != null ? Math.round(value) : '--'}<Text style={{ color: '#94A3B8', fontSize: 9, fontWeight: '500' }}>{primaryUnit(layer)}</Text>
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 9, marginTop: 2 }}>{itemDistance < 1 ? '不到 1 km' : `${itemDistance.toFixed(0)} km`}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: 'wind' | 'droplets' | 'cloud-rain' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: '#F8FAFC', backgroundColor: '#FCFDFE' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
        <WeatherIcon name={icon} size={10} color="#94A3B8" />
        <Text style={{ color: '#9CA3AF', fontSize: 9, fontWeight: '500' }}>{label}</Text>
      </View>
      <Text style={{ color: '#374151', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
