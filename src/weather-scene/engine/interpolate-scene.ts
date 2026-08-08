import type { CloudLayerConfig, ScenePalette, WeatherSceneOutput } from '../types';
import { mixColor } from '../utils/color';
import { clamp, lerp } from '../utils/math';

const mixCloud = (a:CloudLayerConfig,b:CloudLayerConfig,p:number):CloudLayerConfig => ({
  enabled:p<.5?a.enabled:b.enabled, opacity:lerp(a.opacity,b.opacity,p), density:lerp(a.density,b.density,p),
  blur:lerp(a.blur,b.blur,p), scale:lerp(a.scale,b.scale,p), speed:lerp(a.speed,b.speed,p),
  directionDeg:lerp(a.directionDeg,b.directionDeg,p), brightness:lerp(a.brightness,b.brightness,p),
});

export const interpolateScene = (a:WeatherSceneOutput,b:WeatherSceneOutput,progress:number):WeatherSceneOutput => {
  const p=clamp(progress);
  const palette=Object.fromEntries(Object.keys(a.palette).map(key=>[key,mixColor(a.palette[key as keyof ScenePalette],b.palette[key as keyof ScenePalette],p)])) as unknown as ScenePalette;
  return {
    palette,
    lighting:{brightness:lerp(a.lighting.brightness,b.lighting.brightness,p),saturation:lerp(a.lighting.saturation,b.lighting.saturation,p),contrast:lerp(a.lighting.contrast,b.lighting.contrast,p),warmth:lerp(a.lighting.warmth,b.lighting.warmth,p),solarGlow:lerp(a.lighting.solarGlow,b.lighting.solarGlow,p),lunarGlow:lerp(a.lighting.lunarGlow,b.lighting.lunarGlow,p)},
    atmosphere:{hazeOpacity:lerp(a.atmosphere.hazeOpacity,b.atmosphere.hazeOpacity,p),fogOpacity:lerp(a.atmosphere.fogOpacity,b.atmosphere.fogOpacity,p),horizonGlowOpacity:lerp(a.atmosphere.horizonGlowOpacity,b.atmosphere.horizonGlowOpacity,p),visibilityFactor:lerp(a.atmosphere.visibilityFactor,b.atmosphere.visibilityFactor,p),humiditySoftness:lerp(a.atmosphere.humiditySoftness,b.atmosphere.humiditySoftness,p)},
    clouds:{high:mixCloud(a.clouds.high,b.clouds.high,p),middle:mixCloud(a.clouds.middle,b.clouds.middle,p),low:mixCloud(a.clouds.low,b.clouds.low,p)},
    precipitation:{enabled:p<.5?a.precipitation.enabled:b.precipitation.enabled,type:p<.5?a.precipitation.type:b.precipitation.type,opacity:lerp(a.precipitation.opacity,b.precipitation.opacity,p),density:lerp(a.precipitation.density,b.precipitation.density,p),speed:lerp(a.precipitation.speed,b.precipitation.speed,p),angle:lerp(a.precipitation.angle,b.precipitation.angle,p)},
    terrain:{nearMountainOpacity:lerp(a.terrain.nearMountainOpacity,b.terrain.nearMountainOpacity,p),farMountainOpacity:lerp(a.terrain.farMountainOpacity,b.terrain.farMountainOpacity,p),blur:lerp(a.terrain.blur,b.terrain.blur,p),verticalOffset:lerp(a.terrain.verticalOffset,b.terrain.verticalOffset,p)},
    celestial:{mode:p<.5?a.celestial.mode:b.celestial.mode,opacity:lerp(a.celestial.opacity,b.celestial.opacity,p),glow:lerp(a.celestial.glow,b.celestial.glow,p),brightness:lerp(a.celestial.brightness,b.celestial.brightness,p),saturation:lerp(a.celestial.saturation,b.celestial.saturation,p),scale:lerp(a.celestial.scale,b.celestial.scale,p),sunVisible:p<.5?a.celestial.sunVisible:b.celestial.sunVisible,moonVisible:p<.5?a.celestial.moonVisible:b.celestial.moonVisible,starOpacity:lerp(a.celestial.starOpacity,b.celestial.starOpacity,p),sunPosition:{x:lerp(a.celestial.sunPosition.x,b.celestial.sunPosition.x,p),y:lerp(a.celestial.sunPosition.y,b.celestial.sunPosition.y,p)},moonPosition:{x:lerp(a.celestial.moonPosition.x,b.celestial.moonPosition.x,p),y:lerp(a.celestial.moonPosition.y,b.celestial.moonPosition.y,p)}},
    surface:{cardTint:mixColor(a.surface.cardTint,b.surface.cardTint,p),cardOpacity:lerp(a.surface.cardOpacity,b.surface.cardOpacity,p),textPrimary:mixColor(a.surface.textPrimary,b.surface.textPrimary,p),textSecondary:mixColor(a.surface.textSecondary,b.surface.textSecondary,p)},
    animation:{cloudSpeedMultiplier:lerp(a.animation.cloudSpeedMultiplier,b.animation.cloudSpeedMultiplier,p),rainSpeedMultiplier:lerp(a.animation.rainSpeedMultiplier,b.animation.rainSpeedMultiplier,p),transitionDurationMs:lerp(a.animation.transitionDurationMs,b.animation.transitionDurationMs,p),reducedMotion:p<.5?a.animation.reducedMotion:b.animation.reducedMotion},
    qualityTier:p<.5?a.qualityTier:b.qualityTier,
  };
};
