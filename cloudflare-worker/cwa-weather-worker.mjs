const CWA_BASE_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
const CACHE_TTL_SECONDS = 300;
const MOENV_AQI_URL = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
const AIR_QUALITY_CACHE_TTL_SECONDS = 1800;

const COUNTY_FORECAST_IDS = Object.freeze({
  宜蘭縣:'F-D0047-001',桃園市:'F-D0047-005',新竹縣:'F-D0047-009',苗栗縣:'F-D0047-013',彰化縣:'F-D0047-017',南投縣:'F-D0047-021',雲林縣:'F-D0047-025',嘉義縣:'F-D0047-029',屏東縣:'F-D0047-033',臺東縣:'F-D0047-037',花蓮縣:'F-D0047-041',澎湖縣:'F-D0047-045',基隆市:'F-D0047-049',新竹市:'F-D0047-053',嘉義市:'F-D0047-057',臺北市:'F-D0047-061',高雄市:'F-D0047-065',新北市:'F-D0047-069',臺中市:'F-D0047-073',臺南市:'F-D0047-077',連江縣:'F-D0047-081',金門縣:'F-D0047-085',
});

const CORS_HEADERS = Object.freeze({
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Max-Age':'86400',
});

const jsonResponse = (data,status=200,extraHeaders={}) => Response.json(data,{status,headers:{...CORS_HEADERS,'Cache-Control':'no-store',...extraHeaders}});
const normalizeCity = value => value.replaceAll('台','臺').trim();
const finiteNumber = (value,fallback) => {
  if(value===undefined||value===null||value===''||value===-99||value==='-99') return fallback;
  const number=Number(value);
  return Number.isFinite(number)?number:fallback;
};

const taipeiParts = date => {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return {date:`${values.year}-${values.month}-${values.day}`,time:`${values.hour}:${values.minute}`,hour:Number(values.hour),minute:Number(values.minute)};
};

const timeToMinutes = value => {
  const match=String(value??'').match(/(\d{1,2}):(\d{2})/);
  return match?Number(match[1])*60+Number(match[2]):undefined;
};

const isDaylight = (nowTime,sunrise,sunset) => {
  const now=timeToMinutes(nowTime),rise=timeToMinutes(sunrise),set=timeToMinutes(sunset);
  return now!==undefined&&rise!==undefined&&set!==undefined?now>=rise&&now<set:false;
};

const cwaUrl = (datasetId,apiKey,params={}) => {
  const url=new URL(`${CWA_BASE_URL}/${datasetId}`);
  url.searchParams.set('Authorization',apiKey);
  url.searchParams.set('format','JSON');
  for(const [key,value] of Object.entries(params)) if(value) url.searchParams.set(key,value);
  return url;
};

const fetchCwa = async (datasetId,apiKey,params={}) => {
  const response=await fetch(cwaUrl(datasetId,apiKey,params),{headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error(`CWA ${datasetId} HTTP ${response.status}`);
  const data=await response.json();
  if(data?.success===false) throw new Error(`CWA ${datasetId} rejected request`);
  return data;
};

const settledValue = result => result.status==='fulfilled'?result.value:undefined;
const settledWarning = (datasetId,result) => result.status==='rejected'?`${datasetId}: ${result.reason instanceof Error?result.reason.message:String(result.reason)}`:undefined;

const stationCounty = station => String(station?.GeoInfo?.CountyName??'');
const stationTown = station => String(station?.GeoInfo?.TownName??'');
const stationLatitude = station => finiteNumber(station?.GeoInfo?.Coordinates?.[0]?.StationLatitude,undefined);
const stationLongitude = station => finiteNumber(station?.GeoInfo?.Coordinates?.[0]?.StationLongitude,undefined);
const stationObservedAt = station => station?.ObsTime?.DateTime??null;
const stationWeatherText = station => String(station?.WeatherElement?.Now?.Weather??station?.WeatherElement?.Weather??'');

const normalizeObservationStation = station => {
  const temperature=stationTemperature(station);
  if(temperature===undefined) return undefined;
  const element=station?.WeatherElement??{};
  return {
    stationId:String(station?.StationId??''),
    stationName:String(station?.StationName??''),
    county:normalizeCity(stationCounty(station)),
    town:stationTown(station),
    latitude:stationLatitude(station),
    longitude:stationLongitude(station),
    altitude:finiteNumber(station?.StationAltitude,null),
    observedAt:stationObservedAt(station),
    temperature,
    humidity:finiteNumber(element.RelativeHumidity,null),
    windSpeedMs:finiteNumber(element.WindSpeed,null),
    gustSpeedMs:finiteNumber(element.GustSpeed,null),
    windDirectionDeg:finiteNumber(element.WindDirection,null),
    precipitationIntensity:finiteNumber(element.Now?.Precipitation,null),
    visibilityKm:finiteNumber(element.Visibility,null),
    weather:stationWeatherText(station),
  };
};

const fetchMoenvAirQuality = async apiKey => {
  const url=new URL(MOENV_AQI_URL);
  url.searchParams.set('api_key',apiKey);
  url.searchParams.set('format','JSON');
  url.searchParams.set('limit','1000');
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error(`MOENV aqx_p_432 HTTP ${response.status}`);
  const data=await response.json();
  const records=Array.isArray(data)?data:data?.records;
  if(!Array.isArray(records)) throw new Error('環境部 AQI 回傳格式不正確');
  return records;
};

const distanceKm = (latitudeA,longitudeA,latitudeB,longitudeB) => {
  const radians=value=>value*Math.PI/180;
  const latitudeDistance=radians(latitudeB-latitudeA);
  const longitudeDistance=radians(longitudeB-longitudeA);
  const a=Math.sin(latitudeDistance/2)**2+Math.cos(radians(latitudeA))*Math.cos(radians(latitudeB))*Math.sin(longitudeDistance/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

const selectNearestAirQualityStation = (records,latitude,longitude) => {
  const candidates=records
    .map(record=>({record,latitude:finiteNumber(record?.latitude,undefined),longitude:finiteNumber(record?.longitude,undefined),aqi:finiteNumber(record?.aqi,undefined)}))
    .filter(item=>item.latitude!==undefined&&item.longitude!==undefined&&item.aqi!==undefined)
    .map(item=>({...item,distance:distanceKm(latitude,longitude,item.latitude,item.longitude)}))
    .sort((a,b)=>a.distance-b.distance);
  if(!candidates.length) throw new Error('環境部目前沒有可用的空氣品質測站資料');
  return candidates[0];
};

const stationsFrom = data => data?.records?.Station??data?.records?.station??[];
const stationTemperature = station => finiteNumber(station?.WeatherElement?.AirTemperature,undefined);
const stationIsUsable = station => stationTemperature(station)!==undefined;

const selectStation = (stations,city,district) => {
  const valid=stations.filter(stationIsUsable);
  if(!valid.length) throw new Error('中央氣象署目前沒有可用測站資料');
  return valid.find(station=>normalizeCity(station?.GeoInfo?.CountyName??'')===city&&station?.GeoInfo?.TownName===district)
    ??valid.find(station=>normalizeCity(station?.GeoInfo?.CountyName??'')===city)
    ??valid[0];
};

const asArray = value => Array.isArray(value)?value:value?[value]:[];
const weeklyForecastLocationGroupsV2 = data => asArray(data?.records?.locations??data?.records?.Locations);
const forecastLocations = data => {
  const group=weeklyForecastLocationGroupsV2(data)[0];
  return asArray(group?.location??group?.Location);
};
const forecastGroupName = group => normalizeCity(String(group?.locationsName??group?.LocationsName??''));
const forecastLocationName = location => String(location?.locationName??location?.LocationName??'');
const selectForecastLocation = (data,district) => {
  const locations=forecastLocations(data);
  return locations.find(location=>forecastLocationName(location)===district)
    ??locations.find(location=>{
      const name=forecastLocationName(location);
      return Boolean(name)&&(district.includes(name)||name.includes(district));
    })
    ??locations[0];
};

const elementTimes = (location,...names) => {
  const elements=asArray(location?.weatherElement??location?.WeatherElement);
  const element=elements.find(item=>names.includes(item?.elementName??item?.ElementName));
  return asArray(element?.time??element?.Time);
};
const elementValues = item => asArray(item?.elementValue??item?.ElementValue);
const scalarValues = entry => Object.values(entry??{}).filter(value=>typeof value==='string'||typeof value==='number');
const valueFrom = item => {
  const entry=elementValues(item)[0];
  return entry?.value??entry?.Value??scalarValues(entry)[0];
};
const weatherCodeFrom = item => {
  for(const entry of elementValues(item)){
    const explicit=entry?.weatherCode??entry?.WeatherCode;
    if(/^\d+$/.test(String(explicit??''))) return Number(explicit);
    const coded=scalarValues(entry).find(value=>/^\d+$/.test(String(value)));
    if(coded!==undefined) return Number(coded);
  }
  return undefined;
};
const parseForecastTime = value => {
  const normalized=String(value??'').replace(' ','T');
  return Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized)?normalized:`${normalized}+08:00`);
};
const startTimeOf = item => item?.startTime??item?.StartTime;
const endTimeOf = item => item?.endTime??item?.EndTime;
const activeOrNext = times => {
  const now=Date.now();
  return times.find(item=>parseForecastTime(startTimeOf(item))<=now&&parseForecastTime(endTimeOf(item))>now)
    ??times.find(item=>parseForecastTime(endTimeOf(item))>now)
    ??times[0];
};

const decodeWeather = (code,daylight) => {
  if(code===1) return {status:'晴朗',icon:daylight?'Sun':'Moon'};
  if(code>=2&&code<=3) return {status:'晴時多雲',icon:daylight?'CloudSun':'CloudMoon'};
  if(code>=4&&code<=7) return {status:'陰天',icon:'Cloud'};
  if((code>=8&&code<=14)||(code>=19&&code<=22)) return {status:'有雨',icon:'CloudRain'};
  if(code>=15&&code<=18||code>29) return {status:'雷雨',icon:'CloudLightning'};
  if(code===23) return {status:'降雪',icon:'Snowflake'};
  if(code>=24&&code<=28) return {status:'有霧',icon:'CloudFog'};
  return {status:'多雲',icon:'Cloud'};
};

const decodeObservedWeather = (description,daylight,fallbackCode) => {
  const value=String(description??'').trim();
  if(!value||value==='-'||value==='無資料') return decodeWeather(fallbackCode,daylight);
  if(value.includes('雷')) return {status:'雷雨',icon:'CloudLightning'};
  if(value.includes('雨')||value.includes('陣雨')) return {status:'有雨',icon:'CloudRain'};
  if(value.includes('雪')) return {status:'降雪',icon:'Snowflake'};
  if(value.includes('霧')) return {status:'有霧',icon:'CloudFog'};
  if(value.includes('陰')) return {status:'陰天',icon:'Cloud'};
  if(value.includes('晴')&&value.includes('雲')) return {status:'晴時多雲',icon:daylight?'CloudSun':'CloudMoon'};
  if(value.includes('多雲')||value.includes('雲')) return {status:'多雲',icon:'Cloud'};
  if(value.includes('晴')) return {status:'晴朗',icon:daylight?'Sun':'Moon'};
  return decodeWeather(fallbackCode,daylight);
};

const resolveSunTimes = (data,today,city) => {
  const locations=data?.records?.locations?.location??data?.records?.Locations?.Location??[];
  const cityLocation=locations.find(location=>normalizeCity(String(location?.locationName??location?.LocationName??location?.CountyName??''))===city)??locations[0];
  const times=cityLocation?.time??cityLocation?.Time??[];
  const monthDay=today.slice(5);
  const record=times.find(item=>String(item?.Date??item?.date??'')===today)
    ??times.find(item=>String(item?.Date??item?.date??'').slice(5)===monthDay);
  return {
    sunrise:record?.SunRiseTime??record?.SunriseTime??'06:00',
    sunset:record?.SunSetTime??record?.SunsetTime??'18:00',
    sourceDate:record?.Date??record?.date??null,
  };
};

const apparentTemperature = (temperature,humidity,windSpeed) => {
  const vapor=(humidity/100)*6.105*Math.exp((17.27*temperature)/(237.7+temperature));
  return Math.round(1.04*temperature+.2*vapor-.65*windSpeed-2.7);
};

const buildHourly = (location,current,daylight,sunrise,sunset) => {
  const temperatures=elementTimes(location,'T').filter(item=>parseForecastTime(endTimeOf(item))>Date.now()).sort((a,b)=>parseForecastTime(startTimeOf(a))-parseForecastTime(startTimeOf(b)));
  const weather=elementTimes(location,'Wx').filter(item=>parseForecastTime(endTimeOf(item))>Date.now()).sort((a,b)=>parseForecastTime(startTimeOf(a))-parseForecastTime(startTimeOf(b)));
  const pops=[...elementTimes(location,'PoP6h'),...elementTimes(location,'PoP12h')].filter(item=>parseForecastTime(endTimeOf(item))>Date.now()).sort((a,b)=>parseForecastTime(startTimeOf(a))-parseForecastTime(startTimeOf(b)));
  const result=[{time:'現在',temp:`${Math.round(current.temperature)}°`,pop:`${Math.round(current.rain>0?100:0)}%`,status:current.status,icon:current.icon}];
  const now=Date.now();
  for(let index=1;index<=6;index++){
    const target=now+index*60*60*1000;
    const temperature=temperatures.find(item=>parseForecastTime(startTimeOf(item))<=target&&parseForecastTime(endTimeOf(item))>target)??temperatures[0];
    const wx=weather.find(item=>parseForecastTime(startTimeOf(item))<=target&&parseForecastTime(endTimeOf(item))>target)??weather[0];
    const pop=pops.find(item=>parseForecastTime(startTimeOf(item))<=target&&parseForecastTime(endTimeOf(item))>target)??pops[0];
    const clock=taipeiParts(new Date(target));
    const decoded=decodeWeather(weatherCodeFrom(wx)??2,isDaylight(clock.time,sunrise,sunset));
    result.push({time:`${String(clock.hour).padStart(2,'0')}:00`,temp:`${Math.round(finiteNumber(valueFrom(temperature),current.temperature))}°`,pop:`${Math.round(finiteNumber(valueFrom(pop),0))}%`,status:decoded.status,icon:decoded.icon});
  }
  return result;
};

const dateOfForecastTime = value => String(value??'').slice(0,10);
const hourOfForecastTime = value => Number(String(value??'').slice(11,13));
const sortedFutureTimes = times => times.filter(item=>parseForecastTime(endTimeOf(item))>Date.now()).sort((a,b)=>parseForecastTime(startTimeOf(a))-parseForecastTime(startTimeOf(b)));

const buildWeekly = location => {
  const weather=sortedFutureTimes(elementTimes(location,'Wx','天氣現象'));
  const pops=sortedFutureTimes(elementTimes(location,'PoP12h','12小時降雨機率'));
  const minimums=sortedFutureTimes(elementTimes(location,'MinT','最低溫度'));
  const maximums=sortedFutureTimes(elementTimes(location,'MaxT','最高溫度'));
  const today=taipeiParts(new Date()).date;
  const dates=[...new Set([...weather,...minimums,...maximums].map(item=>dateOfForecastTime(startTimeOf(item))).filter(date=>date>=today))].slice(0,7);
  const intervalFor=(times,date,period)=>times.find(item=>{
    const hour=hourOfForecastTime(startTimeOf(item));
    return dateOfForecastTime(startTimeOf(item))===date&&(period==='day'?hour>=6&&hour<18:hour>=18||hour<6);
  });
  const valueForDate=(times,date,fallback)=>{
    const values=times.filter(item=>dateOfForecastTime(startTimeOf(item))===date).map(item=>finiteNumber(valueFrom(item),undefined)).filter(value=>value!==undefined);
    return values.length?(fallback==='min'?Math.min(...values):Math.max(...values)):undefined;
  };
  const periodData=(date,period)=>{
    const wx=intervalFor(weather,date,period);
    const pop=intervalFor(pops,date,period);
    const periodMin=intervalFor(minimums,date,period);
    const periodMax=intervalFor(maximums,date,period);
    if(!wx&&!pop&&!periodMin&&!periodMax) return undefined;
    const code=weatherCodeFrom(wx)??4;
    const min=finiteNumber(valueFrom(periodMin),undefined);
    const max=finiteNumber(valueFrom(periodMax),undefined);
    return {
      status:decodeWeather(code,period==='day').status,
      weatherCode:code,
      pop:pop?Math.round(finiteNumber(valueFrom(pop),0)):null,
      ...(min===undefined?{}:{min}),
      ...(max===undefined?{}:{max}),
    };
  };
  return dates.map(date=>{
    const min=valueForDate(minimums,date,'min');
    const max=valueForDate(maximums,date,'max');
    const temperatureValues=[...minimums,...maximums].filter(item=>dateOfForecastTime(startTimeOf(item))===date).map(item=>finiteNumber(valueFrom(item),undefined)).filter(value=>value!==undefined);
    return {date,day:periodData(date,'day'),night:periodData(date,'night'),min:min??Math.min(...temperatureValues),max:max??Math.max(...temperatureValues)};
  }).filter(item=>Number.isFinite(item.min)&&Number.isFinite(item.max));
};

const handleWeeklyForecast = async (request,env,ctx) => {
  if(!env.CWA_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 CWA_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const city=normalizeCity(requestUrl.searchParams.get('city')??'臺中市');
  const district=(requestUrl.searchParams.get('district')??'北區').trim();
  if(!city||!district||city.length>12||district.length>12) return jsonResponse({error:{code:'INVALID_LOCATION',message:'縣市或鄉鎮市區格式錯誤'}},400);
  const cacheUrl=new URL('/weather/weekly',requestUrl.origin);
  cacheUrl.searchParams.set('city',city);
  cacheUrl.searchParams.set('district',district);
  const cacheKey=new Request(cacheUrl,{method:'GET'});
  const cached=await caches.default.match(cacheKey);
  if(cached){const response=new Response(cached.body,cached);response.headers.set('X-Worker-Cache','HIT');return response;}
  try{
    const data=await fetchCwa('F-D0047-091',env.CWA_API_KEY,{
      LocationName:city,
      ElementName:'天氣現象,12小時降雨機率,最低溫度,最高溫度',
    });
    const groups=weeklyForecastLocationGroupsV2(data);
    const locations=groups.flatMap(group=>asArray(group?.location??group?.Location));
    const normalizedCity=normalizeCity(city);
    const location=locations.find(item=>normalizeCity(forecastLocationName(item))===normalizedCity)
      ??locations.find(item=>{
        const name=normalizeCity(forecastLocationName(item));
        return Boolean(name)&&(normalizedCity.includes(name)||name.includes(normalizedCity));
      });
    if(!location) throw new Error('找不到指定縣市的一週預報');
    const weekly=buildWeekly(location);
    if(!weekly.length) throw new Error('一週預報沒有可用時段');
    const payload={ok:true,location:{city,scope:'county'},weekly,metadata:{source:'中央氣象署開放資料',datasetId:'F-D0047-091',cacheTtlSeconds:CACHE_TTL_SECONDS}};
    const response=jsonResponse(payload,200,{'Cache-Control':`public, max-age=${CACHE_TTL_SECONDS}`,'X-Worker-Cache':'MISS'});
    ctx.waitUntil(caches.default.put(cacheKey,response.clone()));
    return response;
  }catch(error){
    console.error(JSON.stringify({event:'cwa_weekly_error',city,district,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得中央氣象署一週預報，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

const handleCurrentWeather = async (request,env,ctx) => {
  if(!env.CWA_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 CWA_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const city=normalizeCity(requestUrl.searchParams.get('city')??'臺中市');
  const district=(requestUrl.searchParams.get('district')??'北區').trim();
  const forecastId=COUNTY_FORECAST_IDS[city];
  if(!forecastId) return jsonResponse({error:{code:'INVALID_CITY',message:'不支援此縣市'}},400);
  if(!district||district.length>12) return jsonResponse({error:{code:'INVALID_DISTRICT',message:'鄉鎮市區格式錯誤'}},400);

  const cacheUrl=new URL('/weather/current',requestUrl.origin);
  cacheUrl.searchParams.set('city',city);
  cacheUrl.searchParams.set('district',district);
  const cacheKey=new Request(cacheUrl,{method:'GET'});
  const cached=await caches.default.match(cacheKey);
  if(cached){const response=new Response(cached.body,cached);response.headers.set('X-Worker-Cache','HIT');return response;}

  try{
    const upstream=await Promise.allSettled([
      fetchCwa('O-A0003-001',env.CWA_API_KEY),
      fetchCwa('O-A0001-001',env.CWA_API_KEY),
      fetchCwa('A-B0062-001',env.CWA_API_KEY,{CountyName:city}),
      fetchCwa(forecastId,env.CWA_API_KEY,{elementName:'T,Wx,PoP6h,PoP12h'}),
    ]);
    const [bureauResult,automaticResult,sunResult,forecastResult]=upstream;
    const bureau=settledValue(bureauResult);
    const automatic=settledValue(automaticResult);
    const sunData=settledValue(sunResult);
    const forecastData=settledValue(forecastResult);
    const warnings=[settledWarning('O-A0003-001',bureauResult),settledWarning('O-A0001-001',automaticResult),settledWarning('A-B0062-001',sunResult),settledWarning(forecastId,forecastResult)].filter(Boolean);
    const availableStations=[...stationsFrom(bureau),...stationsFrom(automatic)];
    if(!availableStations.length) throw new Error(warnings.join(' | ')||'兩個觀測資料來源皆無測站資料');
    const now=taipeiParts(new Date());
    const sunTimes=resolveSunTimes(sunData,now.date,city);
    const station=selectStation(availableStations,city,district);
    const location=selectForecastLocation(forecastData,district);
    const weather=station.WeatherElement??{};
    const temperature=stationTemperature(station);
    const humidity=finiteNumber(weather.RelativeHumidity,75);
    const windSpeedMs=finiteNumber(weather.WindSpeed,0);
    const windDirectionDeg=finiteNumber(weather.WindDirection,0);
    const rain=Math.max(0,finiteNumber(weather.Now?.Precipitation,0));
    const currentWx=activeOrNext(elementTimes(location,'Wx'));
    const weatherCode=weatherCodeFrom(currentWx)??2;
    const decoded=decodeObservedWeather(weather.Weather,isDaylight(now.time,sunTimes.sunrise,sunTimes.sunset),weatherCode);
    const current={temperature,apparentTemperature:apparentTemperature(temperature,humidity,windSpeedMs),humidity,windSpeedMs,windDirectionDeg,rain,weatherCode,status:decoded.status,icon:decoded.icon};
    const payload={
      ok:true,
      location:{city,district,stationName:station.StationName??'',stationId:station.StationId??'',latitude:finiteNumber(station.GeoInfo?.Coordinates?.[0]?.StationLatitude,undefined),longitude:finiteNumber(station.GeoInfo?.Coordinates?.[0]?.StationLongitude,undefined)},
      current:{temp:String(Math.round(temperature)),status:decoded.status,mainIcon:decoded.icon,feelsLike:`${current.apparentTemperature}°`,humidity:`${Math.round(humidity)}%`,windSpeed:`${Math.round(windSpeedMs*10)/10} m/s`,precipitationMm:rain},
      observation:{observedAt:station.ObsTime?.DateTime??new Date().toISOString(),temperature,apparentTemperature:current.apparentTemperature,humidity,windSpeedMs,windDirectionDeg,precipitationIntensity:rain,weatherCode},
      sunTimes,
      hourly:buildHourly(location,current,isDaylight(now.time,sunTimes.sunrise,sunTimes.sunset),sunTimes.sunrise,sunTimes.sunset),
      metadata:{source:'中央氣象署開放資料',updatedAt:`${now.date}T${now.time}:00+08:00`,cacheTtlSeconds:CACHE_TTL_SECONDS,warnings},
    };
    const response=jsonResponse(payload,200,{'Cache-Control':`public, max-age=${CACHE_TTL_SECONDS}`,'X-Worker-Cache':'MISS'});
    ctx.waitUntil(caches.default.put(cacheKey,response.clone()));
    return response;
  }catch(error){
    console.error(JSON.stringify({event:'cwa_weather_error',city,district,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得中央氣象署觀測資料，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

const handleAirQuality = async (request,env,ctx) => {
  if(!env.MOENV_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 MOENV_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const latitude=finiteNumber(requestUrl.searchParams.get('latitude'),undefined);
  const longitude=finiteNumber(requestUrl.searchParams.get('longitude'),undefined);
  if(latitude===undefined||longitude===undefined||latitude<20||latitude>27||longitude<117||longitude>123){
    return jsonResponse({error:{code:'INVALID_COORDINATES',message:'請提供有效的臺灣經緯度'}},400);
  }

  const cacheUrl=new URL('/air-quality',requestUrl.origin);
  cacheUrl.searchParams.set('latitude',latitude.toFixed(2));
  cacheUrl.searchParams.set('longitude',longitude.toFixed(2));
  const cacheKey=new Request(cacheUrl,{method:'GET'});
  const cached=await caches.default.match(cacheKey);
  if(cached){const response=new Response(cached.body,cached);response.headers.set('X-Worker-Cache','HIT');return response;}

  try{
    const records=await fetchMoenvAirQuality(env.MOENV_API_KEY);
    const nearest=selectNearestAirQualityStation(records,latitude,longitude);
    const record=nearest.record;
    const payload={
      ok:true,
      station:{name:record.sitename??'',county:normalizeCity(record.county??''),siteId:record.siteid??'',latitude:nearest.latitude,longitude:nearest.longitude,distanceKm:Math.round(nearest.distance*10)/10},
      airQuality:{value:nearest.aqi,status:record.status??'',pm25:finiteNumber(record['pm2.5'],null),pm10:finiteNumber(record.pm10,null),o3:finiteNumber(record.o3,null),no2:finiteNumber(record.no2,null)},
      observedAt:record.publishtime??null,
      metadata:{source:'環境部空氣品質指標(AQI)',datasetId:'aqx_p_432',cacheTtlSeconds:AIR_QUALITY_CACHE_TTL_SECONDS},
    };
    const response=jsonResponse(payload,200,{'Cache-Control':`public, max-age=${AIR_QUALITY_CACHE_TTL_SECONDS}`,'X-Worker-Cache':'MISS'});
    ctx.waitUntil(caches.default.put(cacheKey,response.clone()));
    return response;
  }catch(error){
    console.error(JSON.stringify({event:'moenv_air_quality_error',latitude,longitude,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得環境部空氣品質資料，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

const handleObservation = async (request,env,ctx) => {
  if(!env.CWA_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 CWA_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const county=normalizeCity(requestUrl.searchParams.get('county')??'');
  const cacheUrl=new URL('/weather/observation',requestUrl.origin);
  if(county) cacheUrl.searchParams.set('county',county);
  const cacheKey=new Request(cacheUrl,{method:'GET'});
  const cached=await caches.default.match(cacheKey);
  if(cached){const response=new Response(cached.body,cached);response.headers.set('X-Worker-Cache','HIT');return response;}

  try{
    const upstream=await Promise.allSettled([
      fetchCwa('O-A0003-001',env.CWA_API_KEY),
      fetchCwa('O-A0001-001',env.CWA_API_KEY),
    ]);
    const [automaticResult,bureauResult]=upstream;
    const automatic=settledValue(automaticResult);
    const bureau=settledValue(bureauResult);
    const warnings=[settledWarning('O-A0003-001',automaticResult),settledWarning('O-A0001-001',bureauResult)].filter(Boolean);
    const stations=[...stationsFrom(automatic),...stationsFrom(bureau)];
    const normalized=stations.map(normalizeObservationStation).filter(Boolean);
    if(!normalized.length) throw new Error(warnings.join(' | ')||'兩個觀測資料來源皆無可用測站');
    const unique=normalized.filter((station,index,array)=>array.findIndex(item=>item.stationId===station.stationId)===index);
    const filtered=county?unique.filter(station=>station.county===county):unique;
    const payload={
      ok:true,
      count:filtered.length,
      stations:filtered,
      metadata:{source:'中央氣象署開放資料',datasetIds:['O-A0003-001','O-A0001-001'],cacheTtlSeconds:CACHE_TTL_SECONDS,warnings},
    };
    const response=jsonResponse(payload,200,{'Cache-Control':`public, max-age=${CACHE_TTL_SECONDS}`,'X-Worker-Cache':'MISS'});
    ctx.waitUntil(caches.default.put(cacheKey,response.clone()));
    return response;
  }catch(error){
    console.error(JSON.stringify({event:'cwa_observation_error',county,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得中央氣象署測站觀測資料，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

export default {
  async fetch(request,env,ctx){
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:CORS_HEADERS});
    if(request.method!=='GET') return jsonResponse({error:{code:'METHOD_NOT_ALLOWED',message:'僅支援 GET'}},405,{Allow:'GET, OPTIONS'});
    const {pathname}=new URL(request.url);
    if(pathname==='/'||pathname==='/weather/current') return handleCurrentWeather(request,env,ctx);
    if(pathname==='/weather/weekly') return handleWeeklyForecast(request,env,ctx);
    if(pathname==='/weather/observation') return handleObservation(request,env,ctx);
    if(pathname==='/air-quality') return handleAirQuality(request,env,ctx);
    if(pathname==='/health') return jsonResponse({ok:true,service:'cwa-weather-worker'});
    return jsonResponse({error:{code:'NOT_FOUND',message:'找不到此 API 路由'}},404);
  },
};
