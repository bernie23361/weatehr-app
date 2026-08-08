import { interpolateScene } from '../engine/interpolate-scene';
import { resolveWeatherScene } from '../engine/resolve-weather-scene';
import type { WeatherSceneInput, WeatherSceneOutput } from '../types';
import { isValidHexColor } from '../utils/color';

const base: WeatherSceneInput = { region:'central',terrainType:'basin',season:'summer',timePhase:'afternoon',condition:'sunny',temperature:31,humidity:68,cloudiness:18,visibilityKm:22,windSpeedMs:2.4,aqi:42,currentTime:'15:00',sunrise:'05:18',sunset:'18:43' };
const cases: [string, Partial<WeatherSceneInput>][] = [
  ['台北冬季夜間陰雨',{region:'north',season:'winter',timePhase:'night',condition:'rain',humidity:94,cloudiness:96,visibilityKm:4,aqi:55}],
  ['台中夏季晴朗午後',{}],
  ['台中高濕但能見度良好',{humidity:94,visibilityKm:28,condition:'mostly-sunny'}],
  ['台南夏季黃昏',{region:'south',terrainType:'coastal-plain',timePhase:'sunset',condition:'partly-cloudy'}],
  ['花蓮清晨低雲',{region:'east',terrainType:'east-coast',timePhase:'dawn',condition:'cloudy',humidity:91,cloudiness:84}],
  ['澎湖強風晴天',{region:'penghu',terrainType:'offshore-island',condition:'sunny',windSpeedMs:18}],
  ['高 AQI 冬季盆地',{season:'winter',aqi:185,visibilityKm:7,condition:'haze'}],
  ['雷雨與強風',{condition:'thunderstorm',cloudiness:100,precipitationIntensity:18,windSpeedMs:22}],
  ['日出前轉日出後',{timePhase:'dawn',solarElevationDeg:3,currentTime:'05:30'}],
  ['reduced motion',{reducedMotion:true,qualityPreference:'auto'}],
  ['凌晨晴夜',{condition:'sunny',timePhase:'afternoon',currentTime:'2026-07-21T01:25',sunrise:'2026-07-21T05:20',sunset:'2026-07-21T18:45',cloudiness:8,humidity:82,visibilityKm:24}],
  ['凌晨陰夜',{condition:'overcast',timePhase:'afternoon',currentTime:'2026-07-21T01:25',sunrise:'2026-07-21T05:20',sunset:'2026-07-21T18:45',cloudiness:96,humidity:82,visibilityKm:12}],
];

const validate = (name:string, scene:WeatherSceneOutput) => {
  const json=JSON.stringify(scene);
  if (json.includes('null') || json.includes('NaN')) throw new Error(`${name}: invalid numeric value`);
  Object.values(scene.palette).forEach(color=>{if(!isValidHexColor(color)) throw new Error(`${name}: invalid color ${color}`);});
  const bounded=[scene.atmosphere.hazeOpacity,scene.atmosphere.fogOpacity,scene.atmosphere.visibilityFactor,scene.terrain.nearMountainOpacity,scene.terrain.farMountainOpacity,scene.precipitation.opacity,scene.precipitation.density];
  if(bounded.some(value=>value<0||value>1)) throw new Error(`${name}: value outside 0..1`);
};

const scenes=cases.map(([name,override])=>{const scene=resolveWeatherScene({...base,...override});validate(name,scene);return scene;});
if(scenes[2].atmosphere.fogOpacity>.25) throw new Error('高濕且能見度良好不應產生濃霧');
if(scenes[5].animation.cloudSpeedMultiplier<=scenes[1].animation.cloudSpeedMultiplier) throw new Error('強風未提高雲速');
if(!scenes[7].precipitation.enabled||scenes[7].clouds.low.density<.8) throw new Error('雷雨規則不完整');
if(scenes[9].animation.cloudSpeedMultiplier!==0||scenes[9].qualityTier!=='low') throw new Error('reduced motion 規則不完整');
if(scenes[10].celestial.mode!=='moon'||scenes[10].celestial.sunVisible) throw new Error('凌晨晴朗不可顯示太陽');
if(scenes[11].celestial.mode!=='none'||scenes[11].clouds.middle.density<=scenes[10].clouds.middle.density) throw new Error('晴夜與陰夜沒有正確區分');
if(scenes[10].terrain.farMountainOpacity<=scenes[11].terrain.farMountainOpacity) throw new Error('晴夜遠山應比陰夜清楚');
if(!isValidHexColor(scenes[10].surface.cardTint)||!isValidHexColor(scenes[10].surface.textPrimary)) throw new Error('surface 色彩不合法');
for(let i=0;i<=20;i++) validate(`interpolation-${i}`,interpolateScene(scenes[0],scenes[1],i/20));
console.log(`IWESR: ${cases.length} scenarios and 21 interpolation frames passed.`);
