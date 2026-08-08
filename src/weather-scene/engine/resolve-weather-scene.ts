import { conditionModifiers, regionalModifiers, seasonalModifiers, terrainModifiers, type VisualModifier } from '../palettes/modifiers';
import { timePalettes } from '../palettes/time-palettes';
import type { CloudLayerConfig, QualityTier, ScenePalette, TimePhase, WeatherSceneInput, WeatherSceneOutput } from '../types';
import { adjustLightness, adjustSaturation, mixColor } from '../utils/color';
import { clamp, lerp, normalizePercentage, smoothstep } from '../utils/math';

const parseMinutes = (value?: string) => {
  if (!value) return undefined;
  const match = value.match(/(?:T|^)(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
};

export const resolveTimePhase = (input: WeatherSceneInput): TimePhase => {
  const elevation = input.solarElevationDeg;
  if (elevation != null) {
    if (elevation < -12) return 'night';
    if (elevation < -6) return 'twilight';
    if (elevation < 0) return input.timePhase === 'dawn' || input.timePhase === 'pre-dawn' ? 'dawn' : 'twilight';
    if (elevation < 10) return input.timePhase === 'sunset' || input.timePhase === 'twilight' ? 'sunset' : 'morning';
    if (elevation > 35) return 'noon';
  }
  const now = parseMinutes(input.currentTime), sunrise = parseMinutes(input.sunrise), sunset = parseMinutes(input.sunset);
  if (now != null && sunrise != null && sunset != null) {
    if (now < sunrise - 60) return 'pre-dawn';
    if (now < sunrise + 35) return 'dawn';
    if (now < sunrise + 210) return 'morning';
    if (now < sunset - 180) return 'noon';
    if (now < sunset - 45) return 'afternoon';
    if (now < sunset + 25) return 'sunset';
    if (now < sunset + 80) return 'twilight';
    return now > 1380 || now < 180 ? 'late-night' : 'night';
  }
  return input.timePhase;
};

const combineModifiers = (...values: VisualModifier[]) => values.reduce((sum, item) => ({ lightness:sum.lightness+item.lightness, saturation:sum.saturation+item.saturation, warmth:sum.warmth+item.warmth, haze:sum.haze+item.haze }), {lightness:0,saturation:0,warmth:0,haze:0});
const paletteKeys: (keyof ScenePalette)[] = ['skyTop','skyMid','horizon','ambientLight','cloudLight','cloudShadow','mountainNear','mountainFar','cityTint','fogTint'];

const resolvePalette = (input: WeatherSceneInput, phase: TimePhase, humidity: number, aqiFactor: number): ScenePalette => {
  const modifier = combineModifiers(regionalModifiers[input.region], seasonalModifiers[input.season], terrainModifiers[input.terrainType], conditionModifiers[input.condition]);
  const humidityFade = smoothstep(.65, .98, humidity) * .09;
  const warmHaze = clamp(aqiFactor * .14 + Math.max(0, modifier.warmth) * .45);
  return Object.fromEntries(paletteKeys.map(key => {
    let color = adjustLightness(timePalettes[phase][key], modifier.lightness);
    color = adjustSaturation(color, modifier.saturation - humidityFade);
    if (warmHaze > 0) color = mixColor(color, '#b7a98f', warmHaze);
    if (key === 'horizon' || key === 'fogTint') color = mixColor(color, '#f1f2ef', humidityFade * 1.8);
    return [key, color];
  })) as unknown as ScenePalette;
};

const cloud = (density:number, opacity:number, blur:number, scale:number, speed:number, direction:number, brightness:number): CloudLayerConfig => ({ enabled:density>.025, density:clamp(density), opacity:clamp(opacity), blur:clamp(blur,0,20), scale:clamp(scale,.5,2), speed:clamp(speed,0,4), directionDeg:((direction%360)+360)%360, brightness:clamp(brightness,.2,1.4) });

const resolveQualityTier = (input: WeatherSceneInput): QualityTier => {
  if (input.qualityPreference === 'power-saver' || (input.qualityPreference === 'auto' && input.reducedMotion)) return 'low';
  if (input.qualityPreference === 'high') return 'high';
  return 'medium';
};

export const resolveWeatherScene = (input: WeatherSceneInput): WeatherSceneOutput => {
  const humidity = normalizePercentage(input.humidity, 70), cloudiness = normalizePercentage(input.cloudiness, 30);
  const visibilityKm = clamp(input.visibilityKm ?? 18, .1, 60), visibilityFactor = smoothstep(1, 30, visibilityKm);
  const aqiFactor = smoothstep(45, 180, input.aqi ?? 35), wind = clamp(input.windSpeedMs ?? 2, 0, 40);
  const phase = resolveTimePhase(input), night = ['pre-dawn','night','late-night','twilight'].includes(phase);
  const palette = resolvePalette(input, phase, humidity, aqiFactor);
  const precipitationIntensity = clamp(input.precipitationIntensity ?? 0, 0, 30);
  const rainy = ['drizzle','rain','heavy-rain','thunderstorm'].includes(input.condition);
  const storm = input.condition === 'thunderstorm' || input.condition === 'heavy-rain';
  const fogCondition = input.condition === 'fog';
  const humiditySoftness = smoothstep(.58,.98,humidity);
  const fogTrigger = smoothstep(.86,.98,humidity) * (1-smoothstep(1,6,visibilityKm));
  const fogOpacity = clamp((fogCondition ? .36 : 0) + fogTrigger*.58 + (input.terrainType==='basin' ? .035 : 0));
  const hazeOpacity = clamp(regionalModifiers[input.region].haze + terrainModifiers[input.terrainType].haze + aqiFactor*.42 + (1-visibilityFactor)*.25 + humiditySoftness*.08, 0, .78);
  const humidityAttenuation = lerp(1,.55,smoothstep(.72,.98,humidity));
  const hazeAttenuation = lerp(1,.45,hazeOpacity);
  const mountainVisibility = clamp(visibilityFactor * humidityAttenuation * hazeAttenuation);
  const conditionBoost = input.condition==='overcast' ? .28 : rainy ? .38 : input.condition==='partly-cloudy' ? .08 : 0;
  const lowDensity = clamp(cloudiness*.52 + conditionBoost + (storm?.22:0));
  const middleDensity = clamp(cloudiness*.72 + conditionBoost*.65);
  const highDensity = clamp(cloudiness*.38 + (input.condition==='sunny'?.04:.08));
  const cloudSpeedMultiplier = input.reducedMotion ? 0 : lerp(.55,2.1,smoothstep(0,18,wind));
  const direction = input.windDirectionDeg ?? 80;
  const qualityTier = resolveQualityTier(input);
  const rainType = !rainy ? 'none' : input.condition==='drizzle' ? 'drizzle' : storm ? 'heavy-rain' : 'rain';
  const windLean = smoothstep(1,18,wind) * 28 * (Math.sin(direction*Math.PI/180)>=0 ? 1 : -1);
  const glowBase = phase === 'dawn' || phase === 'sunset' ? .72 : phase === 'morning' || phase === 'afternoon' ? .4 : .22;
  const solarGlow = night ? 0 : clamp(glowBase * (1-cloudiness*.7));
  const lightPollution = normalizePercentage(input.lightPollution, input.cityDensity ?? 55);
  const obscured = rainy || input.condition === 'overcast' || input.condition === 'fog';
  const celestialMode: WeatherSceneOutput['celestial']['mode'] = obscured || cloudiness >= .84
    ? 'none'
    : night
      ? cloudiness < .72 ? 'moon' : 'none'
      : 'sun';
  const celestialOpacity = celestialMode === 'none' ? 0 : clamp((1-cloudiness*.62) * (night ? .76 : .94), .18, 1);
  const celestialGlow = celestialMode === 'sun' ? solarGlow : celestialMode === 'moon' ? clamp(.16+(1-cloudiness)*.32) : 0;
  const cardTint = mixColor('#ffffff', night ? palette.skyMid : palette.horizon, night ? .105 : .055);
  const textPrimary = mixColor('#1e293b', palette.skyTop, night ? .08 : .025);
  const textSecondary = mixColor('#64748b', palette.skyMid, night ? .12 : .04);
  return {
    palette,
    lighting:{ brightness:clamp(1-conditionModifiers[input.condition].haze*.45-(night?.38:0),.35,1.15), saturation:clamp(1-humiditySoftness*.16-aqiFactor*.22,.45,1.1), contrast:clamp(1-hazeOpacity*.35-fogOpacity*.4,.5,1.1), warmth:clamp(.5+seasonalModifiers[input.season].warmth+regionalModifiers[input.region].warmth,0,1), solarGlow, lunarGlow:night?clamp(.2+(1-cloudiness)*.35):0 },
    atmosphere:{ hazeOpacity, fogOpacity, horizonGlowOpacity:clamp(.18+humiditySoftness*.3+solarGlow*.36), visibilityFactor, humiditySoftness },
    clouds:{ high:cloud(highDensity,lerp(.12,.46,highDensity),2.5,1.28,.35*cloudSpeedMultiplier,direction,.98), middle:cloud(middleDensity,lerp(.12,.7,middleDensity),1.4,1,.62*cloudSpeedMultiplier,direction,storm?.62:.9), low:cloud(lowDensity,lerp(.1,.78,lowDensity),2.2,.86,.9*cloudSpeedMultiplier,direction,storm?.42:.76) },
    precipitation:{ enabled:rainy, type:rainType, opacity:rainy?clamp(.22+precipitationIntensity/20):0, density:rainy?clamp(.18+precipitationIntensity/12+(storm?.25:0)):0, speed:rainy?lerp(.7,2.4,smoothstep(0,15,precipitationIntensity)):0, angle:windLean },
    terrain:{ nearMountainOpacity:clamp(mountainVisibility*.74), farMountainOpacity:clamp(mountainVisibility*.43), blur:lerp(4,.2,mountainVisibility), verticalOffset:input.terrainType==='basin'?2:input.terrainType==='east-coast'?-3:5 },
    celestial:{ mode:celestialMode,opacity:celestialOpacity,glow:celestialGlow,brightness:celestialMode==='sun'?lerp(.78,1.06,solarGlow):lerp(.7,.92,1-cloudiness),saturation:celestialMode==='sun'?lerp(.62,.94,solarGlow):lerp(.22,.5,1-cloudiness),scale:celestialMode==='sun'?lerp(.88,1.02,solarGlow):lerp(.78,.92,1-cloudiness),sunVisible:celestialMode==='sun',moonVisible:celestialMode==='moon',starOpacity:night?clamp((1-cloudiness)*(1-lightPollution)*.72):0,sunPosition:{x:phase==='morning'?30:phase==='afternoon'||phase==='sunset'?72:54,y:phase==='noon'?18:phase==='sunset'||phase==='dawn'?53:32},moonPosition:{x:68,y:22} },
    surface:{cardTint,cardOpacity:night?.9:.86,textPrimary,textSecondary},
    animation:{ cloudSpeedMultiplier, rainSpeedMultiplier:input.reducedMotion?0:lerp(.7,1.8,smoothstep(0,18,wind)), transitionDurationMs:input.reducedMotion?150:rainy?2200:4200, reducedMotion:!!input.reducedMotion },
    qualityTier,
  };
};
