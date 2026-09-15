// cwa-weather-worker.mjs
//
// 即時天氣 Worker（中央氣象署 + 環境部資料）。
//
// 資料流（v2，KV 快取架構）：
//   定時任務（GitHub Actions，每 15 分鐘）→ buildRealtimeBundles() → 輕量 JSON bundle
//     → wrangler kv key put → Cloudflare KV（WEATHER_REALTIME_KV）
//   用戶請求 → CDN → 本 Worker（只讀 KV，記憶體快取 60 秒）→ 回應
//
//   KV miss 時自動 fallback 回上游（首次部署 bootstrap、或定時任務尚未產出）。
//
// KV 鍵：
//   current:north / current:central / current:south / current:east / current:islands
//     → { meta, cities: { 縣市: { 鄉鎮: <current payload> } }, stations: [全區測站] }
//   weekly:latest → { meta, weekly: { 縣市: <weekly payload> } }
//   air:latest    → { meta, records: [AQI 測站記錄] }
//
// 部署方式：wrangler（wrangler.cwa.jsonc），Worker 名稱必須與既有 Dashboard worker 同名
// 以維持用戶端 URL（workers.dev subdomain）不變。

const CWA_BASE_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
const CACHE_TTL_SECONDS = 300;
const MOENV_AQI_URL = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
const AIR_QUALITY_CACHE_TTL_SECONDS = 1800;

const COUNTY_FORECAST_IDS = Object.freeze({
  宜蘭縣:'F-D0047-001',桃園市:'F-D0047-005',新竹縣:'F-D0047-009',苗栗縣:'F-D0047-013',彰化縣:'F-D0047-017',南投縣:'F-D0047-021',雲林縣:'F-D0047-025',嘉義縣:'F-D0047-029',屏東縣:'F-D0047-033',臺東縣:'F-D0047-037',花蓮縣:'F-D0047-041',澎湖縣:'F-D0047-045',基隆市:'F-D0047-049',新竹市:'F-D0047-053',嘉義市:'F-D0047-057',臺北市:'F-D0047-061',高雄市:'F-D0047-065',新北市:'F-D0047-069',臺中市:'F-D0047-073',臺南市:'F-D0047-077',連江縣:'F-D0047-081',金門縣:'F-D0047-085',
});

// ---- KV 快取 ----
const KV_CURRENT_PREFIX = 'current:';
const KV_WEEKLY_KEY = 'weekly:latest';
const KV_AIR_KEY = 'air:latest';
const REGIONS = Object.freeze(['north', 'central', 'south', 'east', 'islands']);
const CURRENT_CACHE_CONTROL = 'public, max-age=600, s-maxage=600';
const WEEKLY_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600';
const AIR_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600';
const KV_MEMORY_TTL_MS = 60_000;

// ---- 地區分派（鄉鎮區級）----
// 基底：縣市 → 地區；覆寫：特定鄉鎮強制歸離島。
const REGION_BY_CITY = Object.freeze({
  基隆市: 'north', 臺北市: 'north', 新北市: 'north', 桃園市: 'north', 新竹市: 'north', 新竹縣: 'north',
  苗栗縣: 'central', 臺中市: 'central', 彰化縣: 'central', 南投縣: 'central', 雲林縣: 'central',
  嘉義市: 'south', 嘉義縣: 'south', 臺南市: 'south', 高雄市: 'south', 屏東縣: 'south',
  宜蘭縣: 'east', 花蓮縣: 'east', 臺東縣: 'east',
  澎湖縣: 'islands', 金門縣: 'islands', 連江縣: 'islands',
});

const ISLAND_DISTRICTS = Object.freeze({
  臺東縣: Object.freeze(['綠島鄉', '蘭嶼鄉']),
  屏東縣: Object.freeze(['琉球鄉']),
});

const regionOf = (city, district) => {
  const normalizedDistrict = String(district ?? '').trim();
  const overrides = ISLAND_DISTRICTS[city];
  if (overrides && overrides.includes(normalizedDistrict)) return 'islands';
  return REGION_BY_CITY[city];
};

// 全台鄉鎮清單（鏡像 data/taiwan-locations.ts；變動時兩邊需同步）。
const DISTRICTS_BY_CITY = Object.freeze({
  臺北市: ['中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區','北投區','內湖區','南港區','文山區'],
  新北市: ['萬里區','金山區','板橋區','汐止區','深坑區','石碇區','瑞芳區','平溪區','雙溪區','貢寮區','新店區','坪林區','烏來區','永和區','中和區','土城區','三峽區','樹林區','鶯歌區','三重區','新莊區','泰山區','林口區','蘆洲區','五股區','八里區','淡水區','三芝區','石門區'],
  桃園市: ['中壢區','平鎮區','龍潭區','楊梅區','新屋區','觀音區','桃園區','龜山區','八德區','大溪區','復興區','大園區','蘆竹區'],
  臺中市: ['中區','東區','南區','西區','北區','北屯區','西屯區','南屯區','太平區','大里區','霧峰區','烏日區','豐原區','后里區','石岡區','東勢區','和平區','新社區','潭子區','大雅區','神岡區','大肚區','沙鹿區','龍井區','梧棲區','清水區','大甲區','外埔區','大安區'],
  臺南市: ['中西區','東區','南區','北區','安平區','安南區','永康區','歸仁區','新化區','左鎮區','玉井區','楠西區','南化區','仁德區','關廟區','龍崎區','官田區','麻豆區','佳里區','西港區','七股區','將軍區','學甲區','北門區','新營區','後壁區','白河區','東山區','六甲區','下營區','柳營區','鹽水區','善化區','大內區','山上區','新市區','安定區'],
  高雄市: ['新興區','前金區','苓雅區','鹽埕區','鼓山區','旗津區','前鎮區','三民區','楠梓區','小港區','左營區','仁武區','大社區','岡山區','路竹區','阿蓮區','田寮區','燕巢區','橋頭區','梓官區','彌陀區','永安區','湖內區','鳳山區','大寮區','林園區','鳥松區','大樹區','旗山區','美濃區','六龜區','內門區','杉林區','甲仙區','桃源區','那瑪夏區','茂林區','茄萣區'],
  基隆市: ['仁愛區','信義區','中正區','中山區','安樂區','暖暖區','七堵區'],
  新竹市: ['東區','北區','香山區'],
  嘉義市: ['東區','西區'],
  新竹縣: ['竹北市','湖口鄉','新豐鄉','新埔鎮','關西鎮','芎林鄉','寶山鄉','竹東鎮','五峰鄉','橫山鄉','尖石鄉','北埔鄉','峨眉鄉'],
  苗栗縣: ['竹南鎮','頭份市','三灣鄉','南庄鄉','獅潭鄉','後龍鎮','通霄鎮','苑裡鎮','苗栗市','造橋鄉','頭屋鄉','公館鄉','大湖鄉','泰安鄉','銅鑼鄉','三義鄉','西湖鄉','卓蘭鎮'],
  彰化縣: ['彰化市','芬園鄉','花壇鄉','秀水鄉','鹿港鎮','福興鄉','線西鄉','和美鎮','伸港鄉','員林市','社頭鄉','永靖鄉','埔心鄉','溪湖鎮','大村鄉','埔鹽鄉','田中鎮','北斗鎮','田尾鄉','埤頭鄉','溪州鄉','竹塘鄉','二林鎮','大城鄉','芳苑鄉','二水鄉'],
  南投縣: ['南投市','中寮鄉','草屯鎮','國姓鄉','埔里鎮','仁愛鄉','名間鄉','集集鎮','水里鄉','魚池鄉','信義鄉','竹山鎮','鹿谷鄉'],
  雲林縣: ['斗南鎮','大埤鄉','虎尾鎮','土庫鎮','褒忠鄉','東勢鄉','臺西鄉','崙背鄉','麥寮鄉','斗六市','林內鄉','古坑鄉','莿桐鄉','西螺鎮','二崙鄉','北港鎮','水林鄉','口湖鄉','四湖鄉','元長鄉'],
  嘉義縣: ['番路鄉','梅山鄉','竹崎鄉','阿里山鄉','中埔鄉','大埔鄉','水上鄉','鹿草鄉','太保市','朴子市','東石鄉','六腳鄉','新港鄉','民雄鄉','大林鎮','溪口鄉','義竹鄉','布袋鎮'],
  屏東縣: ['屏東市','三地門鄉','霧臺鄉','瑪家鄉','九如鄉','里港鄉','高樹鄉','鹽埔鄉','長治鄉','麟洛鄉','竹田鄉','內埔鄉','萬丹鄉','潮州鎮','泰武鄉','來義鄉','萬巒鄉','崁頂鄉','新埤鄉','南州鄉','林邊鄉','東港鎮','琉球鄉','佳冬鄉','新園鄉','枋寮鄉','枋山鄉','春日鄉','獅子鄉','車城鄉','牡丹鄉','恆春鎮','滿州鄉'],
  宜蘭縣: ['宜蘭市','頭城鎮','礁溪鄉','壯圍鄉','員山鄉','羅東鎮','三星鄉','大同鄉','五結鄉','冬山鄉','蘇澳鎮','南澳鄉'],
  花蓮縣: ['花蓮市','新城鄉','秀林鄉','吉安鄉','壽豐鄉','鳳林鎮','光復鄉','豐濱鄉','瑞穗鄉','萬榮鄉','玉里鎮','卓溪鄉','富里鄉'],
  臺東縣: ['臺東市','綠島鄉','蘭嶼鄉','延平鄉','卑南鄉','鹿野鄉','關山鎮','海端鄉','池上鄉','東河鄉','成功鎮','長濱鄉','太麻里鄉','金峰鄉','大武鄉','達仁鄉'],
  澎湖縣: ['馬公市','西嶼鄉','望安鄉','七美鄉','白沙鄉','湖西鄉'],
  金門縣: ['金沙鎮','金湖鎮','金寧鄉','金城鎮','烈嶼鄉','烏坵鄉'],
  連江縣: ['南竿鄉','北竿鄉','莒光鄉','東引鄉'],
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
  const container=data?.records?.locations??data?.records?.Locations;
  const locations=Array.isArray(container)
    ?container.flatMap(group=>asArray(group?.location??group?.Location))
    :asArray(container?.location??container?.Location);
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

// ---- KV 讀取（含 module 級記憶體快取，避免每個請求重 parse 大型 bundle）----
const kvMemoryCache = new Map();

async function readKvBundle(env, key) {
  if (!env.WEATHER_REALTIME_KV) return undefined;
  const cached = kvMemoryCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < KV_MEMORY_TTL_MS) return cached.value;
  const raw = await env.WEATHER_REALTIME_KV.get(key);
  if (raw === null) return undefined;
  const value = JSON.parse(raw);
  kvMemoryCache.set(key, { value, fetchedAt: Date.now() });
  return value;
}

// ---- 預先組包（定時任務 producer 呼叫；GitHub Actions 或 Worker scheduled）----
function buildCurrentPayload({ city, district, stations, sunData, forecastData, now }) {
  const sunTimes = resolveSunTimes(sunData, now.date, city);
  const station = selectStation(stations, city, district);
  const location = selectForecastLocation(forecastData, district);
  const weather = station.WeatherElement ?? {};
  const temperature = stationTemperature(station);
  const humidity = finiteNumber(weather.RelativeHumidity, 75);
  const windSpeedMs = finiteNumber(weather.WindSpeed, 0);
  const windDirectionDeg = finiteNumber(weather.WindDirection, 0);
  const rain = Math.max(0, finiteNumber(weather.Now?.Precipitation, 0));
  const currentWx = activeOrNext(elementTimes(location, 'Wx'));
  const weatherCode = weatherCodeFrom(currentWx) ?? 2;
  const decoded = decodeObservedWeather(weather.Weather, isDaylight(now.time, sunTimes.sunrise, sunTimes.sunset), weatherCode);
  const current = { temperature, apparentTemperature: apparentTemperature(temperature, humidity, windSpeedMs), humidity, windSpeedMs, windDirectionDeg, rain, weatherCode, status: decoded.status, icon: decoded.icon };
  return {
    ok: true,
    location: { city, district, stationName: station.StationName ?? '', stationId: station.StationId ?? '', latitude: finiteNumber(station.GeoInfo?.Coordinates?.[0]?.StationLatitude, undefined), longitude: finiteNumber(station.GeoInfo?.Coordinates?.[0]?.StationLongitude, undefined) },
    current: { temp: String(Math.round(temperature)), status: decoded.status, mainIcon: decoded.icon, feelsLike: `${current.apparentTemperature}°`, humidity: `${Math.round(humidity)}%`, windSpeed: `${Math.round(windSpeedMs * 10) / 10} m/s`, precipitationMm: rain },
    observation: { observedAt: station.ObsTime?.DateTime ?? new Date().toISOString(), temperature, apparentTemperature: current.apparentTemperature, humidity, windSpeedMs, windDirectionDeg, precipitationIntensity: rain, weatherCode },
    sunTimes,
    hourly: buildHourly(location, current, isDaylight(now.time, sunTimes.sunrise, sunTimes.sunset), sunTimes.sunrise, sunTimes.sunset),
    metadata: { source: '中央氣象署開放資料', updatedAt: `${now.date}T${now.time}:00+08:00`, cacheTtlSeconds: CACHE_TTL_SECONDS, warnings: [] },
  };
}

// 產出 7 個輕量 JSON bundle（以 KV 鍵為 key）。任一資料來源失敗時只跳過對應 bundle，
// 不會覆蓋上次正常資料。環境：{ CWA_API_KEY, MOENV_API_KEY }。
export async function buildRealtimeBundles(env) {
  const apiKey = env?.CWA_API_KEY;
  const moenvKey = env?.MOENV_API_KEY;
  if (!apiKey) throw new Error('CWA_API_KEY is required');

  const countyIds = Object.entries(COUNTY_FORECAST_IDS);
  const upstream = await Promise.allSettled([
    fetchCwa('O-A0003-001', apiKey),
    fetchCwa('O-A0001-001', apiKey),
    fetchCwa('A-B0062-001', apiKey),
    ...countyIds.map(([city, id]) => fetchCwa(id, apiKey, { elementName: 'T,Wx,PoP6h,PoP12h' }).then(data => ({ city, data }))),
    ...countyIds.map(([city]) => fetchCwa('F-D0047-091', apiKey, { LocationName: city, ElementName: '天氣現象,12小時降雨機率,最低溫度,最高溫度' }).then(data => ({ city, data }))),
    ...(moenvKey ? [fetchMoenvAirQuality(moenvKey)] : []),
  ]);

  const automaticResult = upstream[0];
  const bureauResult = upstream[1];
  const sunResult = upstream[2];
  const hourlyResults = upstream.slice(3, 3 + countyIds.length);
  const weeklyResults = upstream.slice(3 + countyIds.length, 3 + countyIds.length * 2);
  const aqiResult = upstream[3 + countyIds.length * 2];

  const warnings = [
    settledWarning('O-A0003-001', automaticResult),
    settledWarning('O-A0001-001', bureauResult),
    settledWarning('A-B0062-001', sunResult),
  ].filter(Boolean);

  const hourlyByCity = {};
  for (const result of hourlyResults) {
    if (result.status === 'fulfilled') hourlyByCity[result.value.city] = result.value.data;
  }
  const weeklyByCity = {};
  for (const result of weeklyResults) {
    if (result.status === 'fulfilled') weeklyByCity[result.value.city] = result.value.data;
  }

  const automatic = settledValue(automaticResult);
  const bureau = settledValue(bureauResult);
  const sunData = settledValue(sunResult);
  const availableStations = [...stationsFrom(bureau), ...stationsFrom(automatic)];

  const generatedAt = new Date().toISOString();
  const now = taipeiParts(new Date());
  const bundles = {};

  // current bundles + observation stations（共用同一份測站）
  const currentByCity = {};
  const stationsByRegion = {};
  if (availableStations.length) {
    for (const [city, districts] of Object.entries(DISTRICTS_BY_CITY)) {
      const forecastData = hourlyByCity[city];
      const cityCurrent = {};
      for (const district of districts) {
        try {
          cityCurrent[district] = buildCurrentPayload({ city, district, stations: availableStations, sunData, forecastData, now });
        } catch { /* 單一鄉鎮失敗跳過 */ }
      }
      if (Object.keys(cityCurrent).length) currentByCity[city] = cityCurrent;
    }
    const seenIds = new Set();
    for (const rawStation of availableStations) {
      const normalized = normalizeObservationStation(rawStation);
      if (!normalized || seenIds.has(normalized.stationId)) continue;
      seenIds.add(normalized.stationId);
      const region = regionOf(normalized.county, normalized.town);
      if (!region) continue;
      (stationsByRegion[region] ??= []).push(normalized);
    }
  }
  for (const region of REGIONS) {
    const cities = {};
    for (const [city, districts] of Object.entries(currentByCity)) {
      if (regionOf(city, '') === region) cities[city] = districts;
    }
    const stations = stationsByRegion[region] ?? [];
    if (!Object.keys(cities).length && !stations.length) continue;
    bundles[`${KV_CURRENT_PREFIX}${region}`] = {
      meta: { generatedAt, source: '中央氣象署開放資料', cacheTtlSeconds: CACHE_TTL_SECONDS, region, warnings },
      cities,
      stations,
    };
  }

  // weekly bundle
  const weeklyBundles = {};
  for (const [city, data] of Object.entries(weeklyByCity)) {
    if (!data) continue;
    try {
      const groups = weeklyForecastLocationGroupsV2(data);
      const locations = groups.flatMap(group => asArray(group?.location ?? group?.Location));
      const normalizedCity = normalizeCity(city);
      const location = locations.find(item => normalizeCity(forecastLocationName(item)) === normalizedCity)
        ?? locations.find(item => {
          const name = normalizeCity(forecastLocationName(item));
          return Boolean(name) && (normalizedCity.includes(name) || name.includes(normalizedCity));
        });
      if (!location) continue;
      const weekly = buildWeekly(location);
      if (!weekly.length) continue;
      weeklyBundles[city] = {
        ok: true,
        location: { city, scope: 'county' },
        weekly,
        metadata: { source: '中央氣象署開放資料', datasetId: 'F-D0047-091', cacheTtlSeconds: CACHE_TTL_SECONDS },
      };
    } catch { /* 單一縣市失敗跳過 */ }
  }
  if (Object.keys(weeklyBundles).length) {
    bundles[KV_WEEKLY_KEY] = { meta: { generatedAt, source: '中央氣象署開放資料', datasetId: 'F-D0047-091', cacheTtlSeconds: CACHE_TTL_SECONDS }, weekly: weeklyBundles };
  }

  // air quality bundle（Worker 於讀取時算最近測站）
  if (aqiResult?.status === 'fulfilled' && Array.isArray(aqiResult.value)) {
    const records = aqiResult.value
      .map(record => ({
        sitename: record.sitename ?? '',
        county: record.county ?? '',
        siteid: record.siteid ?? '',
        latitude: finiteNumber(record.latitude, undefined),
        longitude: finiteNumber(record.longitude, undefined),
        aqi: finiteNumber(record.aqi, undefined),
        status: record.status ?? '',
        pm25: finiteNumber(record['pm2.5'], null),
        pm10: finiteNumber(record.pm10, null),
        o3: finiteNumber(record.o3, null),
        no2: finiteNumber(record.no2, null),
        publishtime: record.publishtime ?? null,
      }))
      .filter(record => record.latitude !== undefined && record.longitude !== undefined && record.aqi !== undefined);
    if (records.length) {
      bundles[KV_AIR_KEY] = { meta: { generatedAt, source: '環境部空氣品質指標(AQI)', datasetId: 'aqx_p_432', cacheTtlSeconds: AIR_QUALITY_CACHE_TTL_SECONDS }, records };
    }
  }

  return bundles;
}

// Worker Cron（Paid 方案用；Free 方案 10ms CPU 不足，定時任務建議放 GitHub Actions）。
export async function scheduled(event, env, ctx) {
  if (!env.WEATHER_REALTIME_KV) throw new Error('WEATHER_REALTIME_KV binding is required');
  const bundles = await buildRealtimeBundles(env);
  await Promise.all(Object.entries(bundles).map(([key, value]) => env.WEATHER_REALTIME_KV.put(key, JSON.stringify(value))));
  console.log(JSON.stringify({ event: 'realtime_kv_refreshed', keys: Object.keys(bundles) }));
}

// ---- 上游 fallback（KV miss 時 bootstrap）----
const handleCurrentWeatherUpstream = async (request, env, ctx) => {
  if(!env.CWA_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 CWA_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const city=normalizeCity(requestUrl.searchParams.get('city')??'臺中市');
  const district=(requestUrl.searchParams.get('district')??'北區').trim();
  const forecastId=COUNTY_FORECAST_IDS[city];
  if(!forecastId) return jsonResponse({error:{code:'INVALID_CITY',message:'不支援此縣市'}},400);
  if(!district||district.length>12) return jsonResponse({error:{code:'INVALID_DISTRICT',message:'鄉鎮市區格式錯誤'}},400);
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
    return jsonResponse(payload,200,{'Cache-Control':CURRENT_CACHE_CONTROL,'X-Worker-Cache':'MISS'});
  }catch(error){
    console.error(JSON.stringify({event:'cwa_weather_error',city,district,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得中央氣象署觀測資料，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

const handleWeeklyForecastUpstream = async (request,env,ctx) => {
  if(!env.CWA_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 CWA_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const city=normalizeCity(requestUrl.searchParams.get('city')??'臺中市');
  const district=(requestUrl.searchParams.get('district')??'北區').trim();
  if(!city||!district||city.length>12||district.length>12) return jsonResponse({error:{code:'INVALID_LOCATION',message:'縣市或鄉鎮市區格式錯誤'}},400);
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
    return jsonResponse(payload,200,{'Cache-Control':WEEKLY_CACHE_CONTROL,'X-Worker-Cache':'MISS'});
  }catch(error){
    console.error(JSON.stringify({event:'cwa_weekly_error',city,district,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得中央氣象署一週預報，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

const handleAirQualityUpstream = async (request,env,ctx) => {
  if(!env.MOENV_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 MOENV_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const latitude=finiteNumber(requestUrl.searchParams.get('latitude'),undefined);
  const longitude=finiteNumber(requestUrl.searchParams.get('longitude'),undefined);
  if(latitude===undefined||longitude===undefined||latitude<20||latitude>27||longitude<117||longitude>123){
    return jsonResponse({error:{code:'INVALID_COORDINATES',message:'請提供有效的臺灣經緯度'}},400);
  }
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
    return jsonResponse(payload,200,{'Cache-Control':AIR_CACHE_CONTROL,'X-Worker-Cache':'MISS'});
  }catch(error){
    console.error(JSON.stringify({event:'moenv_air_quality_error',latitude,longitude,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得環境部空氣品質資料，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

const handleObservationUpstream = async (request,env,ctx) => {
  if(!env.CWA_API_KEY) return jsonResponse({error:{code:'CONFIGURATION_ERROR',message:'Worker 尚未設定 CWA_API_KEY Secret'}},500);
  const requestUrl=new URL(request.url);
  const county=normalizeCity(requestUrl.searchParams.get('county')??'');
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
    return jsonResponse(payload,200,{'Cache-Control':CURRENT_CACHE_CONTROL,'X-Worker-Cache':'MISS'});
  }catch(error){
    console.error(JSON.stringify({event:'cwa_observation_error',county,message:error instanceof Error?error.message:String(error)}));
    return jsonResponse({error:{code:'UPSTREAM_ERROR',message:'目前無法取得中央氣象署測站觀測資料，請稍後再試',details:error instanceof Error?error.message:String(error)}},502);
  }
};

// ---- 路由（KV 優先，miss 時 fallback 上游）----
const handleCurrentWeather = async (request, env, ctx) => {
  const requestUrl = new URL(request.url);
  const city = normalizeCity(requestUrl.searchParams.get('city') ?? '臺中市');
  const district = (requestUrl.searchParams.get('district') ?? '北區').trim();
  const forecastId = COUNTY_FORECAST_IDS[city];
  if (!forecastId) return jsonResponse({ error: { code: 'INVALID_CITY', message: '不支援此縣市' } }, 400);
  if (!district || district.length > 12) return jsonResponse({ error: { code: 'INVALID_DISTRICT', message: '鄉鎮市區格式錯誤' } }, 400);
  const region = regionOf(city, district);
  if (region) {
    const bundle = await readKvBundle(env, `${KV_CURRENT_PREFIX}${region}`);
    const payload = bundle?.cities?.[city]?.[district];
    if (payload) return jsonResponse(payload, 200, { 'Cache-Control': CURRENT_CACHE_CONTROL, 'X-Worker-Cache': 'HIT' });
  }
  return handleCurrentWeatherUpstream(request, env, ctx);
};

const handleWeeklyForecast = async (request, env, ctx) => {
  const requestUrl = new URL(request.url);
  const city = normalizeCity(requestUrl.searchParams.get('city') ?? '臺中市');
  const district = (requestUrl.searchParams.get('district') ?? '北區').trim();
  if (!city || !district || city.length > 12 || district.length > 12) return jsonResponse({ error: { code: 'INVALID_LOCATION', message: '縣市或鄉鎮市區格式錯誤' } }, 400);
  const bundle = await readKvBundle(env, KV_WEEKLY_KEY);
  const payload = bundle?.weekly?.[city];
  if (payload) return jsonResponse(payload, 200, { 'Cache-Control': WEEKLY_CACHE_CONTROL, 'X-Worker-Cache': 'HIT' });
  return handleWeeklyForecastUpstream(request, env, ctx);
};

const handleAirQuality = async (request, env, ctx) => {
  const requestUrl = new URL(request.url);
  const latitude = finiteNumber(requestUrl.searchParams.get('latitude'), undefined);
  const longitude = finiteNumber(requestUrl.searchParams.get('longitude'), undefined);
  if (latitude === undefined || longitude === undefined || latitude < 20 || latitude > 27 || longitude < 117 || longitude > 123) {
    return jsonResponse({ error: { code: 'INVALID_COORDINATES', message: '請提供有效的臺灣經緯度' } }, 400);
  }
  const bundle = await readKvBundle(env, KV_AIR_KEY);
  if (bundle?.records?.length) {
    try {
      const nearest = selectNearestAirQualityStation(bundle.records, latitude, longitude);
      const record = nearest.record;
      const payload = {
        ok: true,
        station: { name: record.sitename ?? '', county: normalizeCity(record.county ?? ''), siteId: record.siteid ?? '', latitude: nearest.latitude, longitude: nearest.longitude, distanceKm: Math.round(nearest.distance * 10) / 10 },
        airQuality: { value: nearest.aqi, status: record.status ?? '', pm25: finiteNumber(record.pm25, null), pm10: finiteNumber(record.pm10, null), o3: finiteNumber(record.o3, null), no2: finiteNumber(record.no2, null) },
        observedAt: record.publishtime ?? null,
        metadata: { source: '環境部空氣品質指標(AQI)', datasetId: 'aqx_p_432', cacheTtlSeconds: AIR_QUALITY_CACHE_TTL_SECONDS },
      };
      return jsonResponse(payload, 200, { 'Cache-Control': AIR_CACHE_CONTROL, 'X-Worker-Cache': 'HIT' });
    } catch (error) {
      console.error(JSON.stringify({ event: 'kv_air_quality_compute_error', latitude, longitude, message: error instanceof Error ? error.message : String(error) }));
    }
  }
  return handleAirQualityUpstream(request, env, ctx);
};

const handleObservation = async (request, env, ctx) => {
  const requestUrl = new URL(request.url);
  const county = normalizeCity(requestUrl.searchParams.get('county') ?? '');
  if (county) {
    const region = regionOf(county, '');
    if (region) {
      const bundle = await readKvBundle(env, `${KV_CURRENT_PREFIX}${region}`);
      if (bundle?.stations) {
        const stations = bundle.stations.filter(station => station.county === county);
        return jsonResponse({ ok: true, count: stations.length, stations, metadata: { source: '中央氣象署開放資料', datasetIds: ['O-A0003-001', 'O-A0001-001'], cacheTtlSeconds: CACHE_TTL_SECONDS } }, 200, { 'Cache-Control': CURRENT_CACHE_CONTROL, 'X-Worker-Cache': 'HIT' });
      }
    }
  } else {
    const allStations = [];
    for (const region of REGIONS) {
      const bundle = await readKvBundle(env, `${KV_CURRENT_PREFIX}${region}`);
      if (bundle?.stations) allStations.push(...bundle.stations);
    }
    if (allStations.length) {
      return jsonResponse({ ok: true, count: allStations.length, stations: allStations, metadata: { source: '中央氣象署開放資料', datasetIds: ['O-A0003-001', 'O-A0001-001'], cacheTtlSeconds: CACHE_TTL_SECONDS } }, 200, { 'Cache-Control': CURRENT_CACHE_CONTROL, 'X-Worker-Cache': 'HIT' });
    }
  }
  return handleObservationUpstream(request, env, ctx);
};

export { DISTRICTS_BY_CITY, REGIONS, regionOf, buildCurrentPayload, normalizeObservationStation, stationsFrom };

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== 'GET') return jsonResponse({ error: { code: 'METHOD_NOT_ALLOWED', message: '僅支援 GET' } }, 405, { Allow: 'GET, OPTIONS' });
    const { pathname } = new URL(request.url);
    if (pathname === '/' || pathname === '/health') {
      const bundle = await readKvBundle(env, `${KV_CURRENT_PREFIX}north`);
      return jsonResponse({ ok: true, service: 'cwa-weather-worker', status: 'running', cache: { kv: Boolean(env.WEATHER_REALTIME_KV), lastGeneratedAt: bundle?.meta?.generatedAt ?? null } });
    }
    if (pathname === '/weather/current') return handleCurrentWeather(request, env, ctx);
    if (pathname === '/weather/weekly') return handleWeeklyForecast(request, env, ctx);
    if (pathname === '/weather/observation') return handleObservation(request, env, ctx);
    if (pathname === '/air-quality') return handleAirQuality(request, env, ctx);
    return jsonResponse({ error: { code: 'NOT_FOUND', message: '找不到此 API 路由' } }, 404);
  },
  scheduled,
};