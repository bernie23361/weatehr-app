import type { CurrentWeatherObservation } from '../../../services/weather-api';
import type { AppData } from '../../../types/weather';
import type { Region, SceneQualityPreference, Season, TerrainType, TimePhase, WeatherCondition, WeatherSceneInput } from '../types';

const north = new Set(['臺北市','新北市','基隆市','桃園市','新竹市','新竹縣','宜蘭縣']);
const central = new Set(['臺中市','苗栗縣','彰化縣','南投縣','雲林縣']);
const south = new Set(['嘉義市','嘉義縣','臺南市','高雄市','屏東縣']);
const east = new Set(['花蓮縣','臺東縣']);

const resolveRegion = (city:string):Region => city==='澎湖縣'?'penghu':city==='金門縣'?'kinmen':city==='連江縣'?'matsu':north.has(city)?'north':central.has(city)?'central':south.has(city)?'south':east.has(city)?'east':'central';
const resolveTerrain = (city:string,district:string):TerrainType => ['澎湖縣','金門縣','連江縣'].includes(city)?'offshore-island':['臺北市','新北市','臺中市'].includes(city)?'basin':['花蓮縣','臺東縣'].includes(city)?(district.includes('市')?'east-coast':'mountain-valley'):city==='南投縣'?'mountain-valley':'coastal-plain';
const resolveSeason = (date:Date):Season => {const m=date.getMonth()+1;return m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';};
const resolveTime = (date:Date):TimePhase => {const h=date.getHours();return h<4?'late-night':h<5?'pre-dawn':h<7?'dawn':h<11?'morning':h<14?'noon':h<17?'afternoon':h<19?'sunset':h<20?'twilight':'night';};
const resolveCondition = (code:number,wind:number):WeatherCondition => code===0?'sunny':code===1?'mostly-sunny':code===2?'partly-cloudy':code===3?'overcast':[45,48].includes(code)?'fog':[51,53,55,56,57].includes(code)?'drizzle':[61,63,66,80,81].includes(code)?'rain':[65,67,82].includes(code)?'heavy-rain':[95,96,99].includes(code)?'thunderstorm':wind>=12?'windy':'cloudy';

export const weatherObservationToSceneInput = (observation:CurrentWeatherObservation,data:AppData,qualityPreference:SceneQualityPreference,reducedMotion:boolean):WeatherSceneInput => {
  const now=new Date(observation.observedAt);
  return {region:resolveRegion(data.location.city),terrainType:resolveTerrain(data.location.city,data.location.district),season:resolveSeason(now),timePhase:resolveTime(now),condition:resolveCondition(observation.weatherCode,observation.windSpeedMs),latitude:observation.latitude,longitude:observation.longitude,temperature:observation.temperature,apparentTemperature:observation.apparentTemperature,humidity:observation.humidity,cloudiness:observation.cloudiness,precipitationIntensity:observation.precipitationIntensity,visibilityKm:observation.visibilityKm,windSpeedMs:observation.windSpeedMs,windDirectionDeg:observation.windDirectionDeg,aqi:data.aqi.value,sunrise:observation.sunrise,sunset:observation.sunset,currentTime:observation.observedAt,cityDensity:['臺北市','新北市','臺中市','高雄市'].includes(data.location.city)?85:48,lightPollution:['臺北市','新北市','臺中市','高雄市'].includes(data.location.city)?80:40,qualityPreference,reducedMotion};
};
