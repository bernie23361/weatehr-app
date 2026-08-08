export type Region = 'north' | 'central' | 'south' | 'east' | 'penghu' | 'kinmen' | 'matsu';
export type TerrainType = 'basin' | 'coastal-plain' | 'mountain-valley' | 'east-coast' | 'offshore-island';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimePhase = 'pre-dawn' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'twilight' | 'night' | 'late-night';
export type WeatherCondition = 'sunny' | 'mostly-sunny' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'drizzle' | 'rain' | 'heavy-rain' | 'thunderstorm' | 'fog' | 'haze' | 'windy';
export type SceneQualityPreference = 'auto' | 'power-saver' | 'standard' | 'high';
export type QualityTier = 'low' | 'medium' | 'high';

export interface WeatherSceneInput {
  region: Region;
  terrainType: TerrainType;
  season: Season;
  timePhase: TimePhase;
  condition: WeatherCondition;
  latitude?: number;
  longitude?: number;
  temperature: number;
  apparentTemperature?: number;
  humidity: number;
  cloudiness: number;
  precipitationProbability?: number;
  precipitationIntensity?: number;
  visibilityKm?: number;
  windSpeedMs?: number;
  windDirectionDeg?: number;
  aqi?: number;
  sunrise?: string;
  sunset?: string;
  currentTime?: string;
  solarElevationDeg?: number;
  cityDensity?: number;
  lightPollution?: number;
  qualityPreference?: SceneQualityPreference;
  reducedMotion?: boolean;
}

export interface ScenePalette {
  skyTop: string;
  skyMid: string;
  horizon: string;
  ambientLight: string;
  cloudLight: string;
  cloudShadow: string;
  mountainNear: string;
  mountainFar: string;
  cityTint: string;
  fogTint: string;
}

export interface CloudLayerConfig {
  enabled: boolean;
  opacity: number;
  density: number;
  blur: number;
  scale: number;
  speed: number;
  directionDeg: number;
  brightness: number;
}

export interface WeatherSceneOutput {
  palette: ScenePalette;
  lighting: { brightness: number; saturation: number; contrast: number; warmth: number; solarGlow: number; lunarGlow: number };
  atmosphere: { hazeOpacity: number; fogOpacity: number; horizonGlowOpacity: number; visibilityFactor: number; humiditySoftness: number };
  clouds: { high: CloudLayerConfig; middle: CloudLayerConfig; low: CloudLayerConfig };
  precipitation: { enabled: boolean; type: 'none' | 'drizzle' | 'rain' | 'heavy-rain'; opacity: number; density: number; speed: number; angle: number };
  terrain: { nearMountainOpacity: number; farMountainOpacity: number; blur: number; verticalOffset: number };
  celestial: {
    mode: 'sun' | 'moon' | 'none';
    opacity: number;
    glow: number;
    brightness: number;
    saturation: number;
    scale: number;
    sunVisible: boolean;
    moonVisible: boolean;
    starOpacity: number;
    sunPosition: { x: number; y: number };
    moonPosition: { x: number; y: number };
  };
  surface: { cardTint: string; cardOpacity: number; textPrimary: string; textSecondary: string };
  animation: { cloudSpeedMultiplier: number; rainSpeedMultiplier: number; transitionDurationMs: number; reducedMotion: boolean };
  qualityTier: QualityTier;
}
