import type { ReactNode } from 'react';
import { NativeModules, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MAIN_GROUP_BBOX, taiwanIslands } from '@/data/taiwan-islands';

const EXPTECH_TILE_URL = 'https://static.lb.exptech.dev/api/v1/map/tiles/{z}/{x}/{y}.pbf';
const TAIWAN_BOUNDS: [number, number, number, number] = [118.15, 21.87, 122.05, 25.32];
type MapBounds = [number, number, number, number];
type MapPadding = { top: number; right: number; bottom: number; left: number };

type MapLibreModule = typeof import('@maplibre/maplibre-react-native');

let mapLibreModule: MapLibreModule | null | undefined;

export function getMapLibreModule(): MapLibreModule | null {
  if (!NativeModules.MLRNCameraModule) return null;
  if (mapLibreModule !== undefined) return mapLibreModule;

  try {
    // MapLibre is not bundled into Expo Go. Requiring it only after checking the
    // native module keeps Expo Go previews from crashing at startup.
    mapLibreModule = require('@maplibre/maplibre-react-native') as MapLibreModule;
  } catch {
    mapLibreModule = null;
  }

  return mapLibreModule;
}

const mapStyle = {
  version: 8,
  sources: {
    exptech: {
      type: 'vector',
      tiles: [EXPTECH_TILE_URL],
      minzoom: 0,
      maxzoom: 12,
      attribution: 'ExpTechTW',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#E8F0F8' } },
    {
      id: 'land', type: 'fill', source: 'exptech', 'source-layer': 'global',
      paint: { 'fill-color': '#DCE6EF' },
    },
    {
      id: 'county-fill', type: 'fill', source: 'exptech', 'source-layer': 'city',
      paint: { 'fill-color': '#DCE6EF' },
    },
    {
      id: 'town-fill', type: 'fill', source: 'exptech', 'source-layer': 'town',
      paint: { 'fill-color': '#DCE6EF' },
    },
    {
      id: 'town-outline', type: 'line', source: 'exptech', 'source-layer': 'town', minzoom: 7.5,
      paint: {
        'line-color': '#8AA0B3',
        'line-width': 0.65,
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 0, 8.25, 0.58],
      },
    },
    {
      id: 'county-outline', type: 'line', source: 'exptech', 'source-layer': 'city',
      paint: {
        'line-color': '#607C95',
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 11, 1.25],
        'line-opacity': 0.82,
      },
    },
  ],
} satisfies import('@maplibre/maplibre-react-native').StyleSpecification;

interface TaiwanMapProps {
  allowTap?: boolean;
  children?: ReactNode;
  initialBounds?: MapBounds;
  initialPadding?: MapPadding;
}

export function TaiwanMap({ children, initialBounds = TAIWAN_BOUNDS, initialPadding = { top: 24, right: 20, bottom: 24, left: 20 } }: TaiwanMapProps) {
  const mapLibre = getMapLibreModule();

  if (!mapLibre) {
    return <TaiwanMapFallback />;
  }

  const { Camera, Map } = mapLibre;

  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={mapStyle}
      preferredFramesPerSecond={60}
      androidView="surface"
      touchRotate={false}
      touchPitch={false}
      compass={false}
      scaleBar={false}
      logo={false}
      attribution
      attributionPosition={{ bottom: 8, right: 8 }}
    >
      <Camera
        minZoom={4}
        maxZoom={16}
        maxBounds={[110, 10, 132, 35]}
        initialViewState={{
          bounds: initialBounds,
          padding: initialPadding,
        }}
      />
      {children}
    </Map>
  );
}

function TaiwanMapFallback() {
  const { minX, minY, maxX, maxY } = MAIN_GROUP_BBOX;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F0F8' }}>
      <Svg width="88%" height="78%" viewBox={`${minX - 18} ${minY - 18} ${width + 36} ${height + 36}`}>
        {taiwanIslands.map((island) => (
          <Path
            key={island.id}
            d={island.d}
            fill="#DCE6EF"
            stroke="#607C95"
            strokeWidth={island.id === 'taiwan' ? 3 : 1.4}
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}
