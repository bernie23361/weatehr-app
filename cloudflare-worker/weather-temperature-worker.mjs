// weather-temperature-worker.mjs
// 溫度觀測格點圖 Worker
//
// 資料來源：中央氣象署「即時觀測」測站（O-A0003-001 自動站 + O-A0001-001 局屬站），
// 在伺服器端以 IDW（反距離加權）插值到臺灣陸域遮罩格點，再輸出 PNG。
//
// 色盤：與 App 的 config/temperature-grid.ts 完全一致（-5..39°C，>39 紫色），
// 確保 測站、圖例、格點 PNG 使用同一套色盤。
//
// 部署方式與既有 Worker 相同：完整取代 Cloudflare Dashboard「Edit code」內容。

const CWA_BASE_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
const OBS_DATASETS = ['O-A0003-001', 'O-A0001-001'];

// ---- 格點 / 範圍 ----
// 預設範圍與 App config/temperature-grid.ts 的 TEMPERATURE_BOUNDS 一致。
const DEFAULT_BOUNDS = { west: 120.008, south: 21.878, east: 121.988, north: 25.448 };
const GRID_RESOLUTION = 0.007; // 度（約 780m）——真實解析度
const DEFAULT_SCALE = 4;
const MAX_OUTPUT_DIM = 2048; // 輸出長邊上限（px）
const MAX_IDW_RADIUS_KM = 40;
const STATION_CACHE_TTL_SECONDS = 300;
const TEMPERATURE_PNG_KEY = 'temperature/latest.png';
const TEMPERATURE_METADATA_KEY = 'temperature/latest.json';

const DEG_TO_RAD = Math.PI / 180;

// ---- 色盤（與 config/temperature-grid.ts 相同）----
const TEMPERATURE_MIN = -5;
const TEMPERATURE_MAX = 39;
const ABOVE_MAX_COLOR = [0x78, 0x2b, 0x95];
const TEMPERATURE_STOPS = [
  // 依中央氣象署即時溫度分布圖圖例取色（2026-08-20）。
  { temp: -5, color: [0x10, 0x73, 0x88] },
  { temp: -1, color: [0x10, 0x73, 0x88] },
  { temp: 1, color: [0x22, 0x7e, 0x93] },
  { temp: 3, color: [0x3d, 0x94, 0xa8] },
  { temp: 5, color: [0x63, 0xb0, 0xc2] },
  { temp: 7, color: [0x87, 0xcc, 0xd9] },
  { temp: 9, color: [0xa5, 0xe1, 0xec] },
  { temp: 10, color: [0xb3, 0xeb, 0xf8] },
  { temp: 11, color: [0x0d, 0x89, 0x4d] },
  { temp: 13, color: [0x2f, 0xa2, 0x57] },
  { temp: 15, color: [0x51, 0xb2, 0x65] },
  { temp: 17, color: [0x74, 0xc1, 0x6f] },
  { temp: 19, color: [0x95, 0xd0, 0x7e] },
  { temp: 21, color: [0xbb, 0xdf, 0x88] },
  { temp: 23, color: [0xd9, 0xf1, 0x91] },
  { temp: 25, color: [0xf6, 0xe7, 0x8c] },
  { temp: 27, color: [0xf3, 0xc3, 0x61] },
  { temp: 29, color: [0xeb, 0x9d, 0x39] },
  { temp: 31, color: [0xe0, 0x7b, 0x07] },
  { temp: 33, color: [0xea, 0x17, 0x5a] },
  { temp: 35, color: [0x75, 0x03, 0x0b] },
  { temp: 36, color: [0x9a, 0x68, 0xb1] },
  { temp: 37, color: [0x8d, 0x4f, 0xa4] },
  { temp: 38, color: [0x78, 0x2b, 0x95] },
  { temp: 39, color: [0x78, 0x2b, 0x95] },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function temperatureColor(value) {
  if (value > TEMPERATURE_MAX) return ABOVE_MAX_COLOR;
  if (value <= TEMPERATURE_MIN) return TEMPERATURE_STOPS[0].color;
  for (let index = 0; index < TEMPERATURE_STOPS.length - 1; index += 1) {
    const start = TEMPERATURE_STOPS[index];
    const end = TEMPERATURE_STOPS[index + 1];
    if (value <= end.temp) {
      const progress = (value - start.temp) / (end.temp - start.temp || 1);
      const t = clamp(progress, 0, 1);
      return [
        Math.round(start.color[0] + (end.color[0] - start.color[0]) * t),
        Math.round(start.color[1] + (end.color[1] - start.color[1]) * t),
        Math.round(start.color[2] + (end.color[2] - start.color[2]) * t),
      ];
    }
  }
  return TEMPERATURE_STOPS[TEMPERATURE_STOPS.length - 1].color;
}

// ---- 臺灣本島陸域遮罩（141 點，由 App 的 taiwan-islands.ts 主島外輪廓簡化並轉為 WGS84）----
const MAINLAND = [
  [21.91814, 120.72836], [21.97814, 120.71551], [22.02457, 120.68551], [22.05886, 120.70694],
  [22.09314, 120.71765], [22.14957, 120.70051], [22.20886, 120.68622], [22.26743, 120.65336],
  [22.34029, 120.60622], [22.43886, 120.45908], [22.49029, 120.37479], [22.52886, 120.33408],
  [22.51529, 120.31265], [22.53957, 120.29622], [22.52814, 120.32194], [22.54743, 120.29979],
  [22.60171, 120.26408], [22.62671, 120.26408], [22.66314, 120.25265], [22.68957, 120.25908],
  [22.80529, 120.21479], [22.82171, 120.20837], [22.86671, 120.19337], [22.96529, 120.15622],
  [22.99743, 120.13979], [23.06814, 120.03908], [23.11957, 120.04479], [23.15886, 120.05979],
  [23.26314, 120.09408], [23.311, 120.11194], [23.38386, 120.13265], [23.39243, 120.16479],
  [23.42243, 120.15051], [23.43314, 120.14622], [23.45457, 120.15265], [23.49029, 120.15622],
  [23.49529, 120.15694], [23.51814, 120.12051], [23.53314, 120.15051], [23.59814, 120.13979],
  [23.61671, 120.13336], [23.636, 120.11551], [23.70671, 120.14765], [23.75886, 120.16979],
  [23.80529, 120.17194], [23.84814, 120.20551], [23.89529, 120.25694], [23.93457, 120.28051],
  [23.99886, 120.31694], [24.03886, 120.34265], [24.08814, 120.38551], [24.13529, 120.40051],
  [24.15029, 120.41336], [24.18243, 120.42479], [24.20886, 120.45837], [24.34957, 120.55979],
  [24.43171, 120.61551], [24.626, 120.75194], [24.70171, 120.85694], [24.76386, 120.89836],
  [24.821, 120.90194], [24.85314, 120.91336], [24.92671, 120.96908], [24.99029, 121.00979],
  [25.04886, 121.07336], [25.08457, 121.15979], [25.12171, 121.24051], [25.12314, 121.32622],
  [25.16671, 121.39265], [25.18314, 121.40551], [25.19243, 121.42051], [25.24814, 121.44908],
  [25.26957, 121.48051], [25.28386, 121.51765], [25.291, 121.54694], [25.27814, 121.61765],
  [25.23029, 121.64336], [25.216, 121.65265], [25.216, 121.70194], [25.17529, 121.70979],
  [25.156, 121.74265], [25.15957, 121.77694], [25.14886, 121.80694], [25.12814, 121.81908],
  [25.12814, 121.84265], [25.11457, 121.91551], [25.08457, 121.91408], [25.03957, 121.92908],
  [25.02671, 121.97622], [25.01886, 121.99908], [24.97314, 121.93265], [24.93886, 121.89051],
  [24.84671, 121.82836], [24.76314, 121.81765], [24.66243, 121.83908], [24.60029, 121.88551],
  [24.58386, 121.87265], [24.57529, 121.86908], [24.51243, 121.83836], [24.48529, 121.84979],
  [24.47671, 121.84265], [24.43314, 121.80051], [24.37171, 121.78694], [24.28314, 121.74908],
  [24.19529, 121.66336], [24.11814, 121.65194], [24.08243, 121.61622], [23.97243, 121.63051],
  [23.93171, 121.61122], [23.80529, 121.57336], [23.69814, 121.55336], [23.64743, 121.53622],
  [23.55243, 121.51122], [23.48171, 121.51265], [23.31314, 121.46194], [23.23529, 121.41479],
  [23.206, 121.39694], [23.13529, 121.39908], [23.11386, 121.39551], [23.09029, 121.36051],
  [23.01957, 121.33694], [22.95457, 121.29479], [22.91457, 121.27122], [22.86457, 121.23265],
  [22.83243, 121.18551], [22.796, 121.20051], [22.71671, 121.12479], [22.67671, 121.05694],
  [22.58886, 121.00908], [22.45743, 120.94694], [22.23029, 120.89836], [22.13171, 120.88694],
  [22.111, 120.89122], [22.03314, 120.90051], [21.99743, 120.87408], [21.90029, 120.86622],
  [21.91314, 120.84694], [21.93314, 120.81265], [21.95886, 120.76551], [21.91814, 120.72908],
];

function buildLandRanges(bounds, cols, rows) {
  const ranges = Array.from({ length: rows }, () => []);
  const lonStep = (bounds.east - bounds.west) / cols;
  for (let row = 0; row < rows; row += 1) {
    const lat = bounds.north - (row + 0.5) * (bounds.north - bounds.south) / rows;
    const intersections = [];
    for (let i = 0, j = MAINLAND.length - 1; i < MAINLAND.length; j = i, i += 1) {
      const [latA, lonA] = MAINLAND[j];
      const [latB, lonB] = MAINLAND[i];
      if ((latA > lat) === (latB > lat)) continue;
      intersections.push(lonA + (lonB - lonA) * (lat - latA) / (latB - latA));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const start = clamp(Math.ceil((intersections[i] - bounds.west) / lonStep - 0.5), 0, cols - 1);
      const end = clamp(Math.floor((intersections[i + 1] - bounds.west) / lonStep - 0.5), 0, cols - 1);
      if (end >= start) ranges[row].push(start, end);
    }
  }
  return ranges;
}

// ---- 中央氣象署測站抓取 ----
const finiteNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '' || value === -99 || value === '-99') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const stationLatitude = (station) => finiteNumber(station?.GeoInfo?.Coordinates?.[0]?.StationLatitude, undefined);
const stationLongitude = (station) => finiteNumber(station?.GeoInfo?.Coordinates?.[0]?.StationLongitude, undefined);
const stationTemperature = (station) => finiteNumber(station?.WeatherElement?.AirTemperature, undefined);
const stationObservedAt = (station) => station?.ObsTime?.DateTime ?? station?.ObsTime?.Time ?? null;
const stationIdOf = (station) => String(station?.StationId ?? station?.stationId ?? '');

const fetchCwa = async (datasetId, apiKey) => {
  const url = new URL(`${CWA_BASE_URL}/${datasetId}`);
  url.searchParams.set('Authorization', apiKey);
  url.searchParams.set('format', 'JSON');
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`CWA ${datasetId} HTTP ${response.status}`);
  const data = await response.json();
  if (data?.success === false) throw new Error(`CWA ${datasetId} rejected`);
  return data;
};

const stationsFrom = (data) => data?.records?.Station ?? data?.records?.station ?? [];

async function fetchObservationStations(apiKey) {
  const settled = await Promise.allSettled(OBS_DATASETS.map((id) => fetchCwa(id, apiKey)));
  const stations = [];
  const seen = new Set();
  let latestObservedAt = null;
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const list = stationsFrom(result.value);
    for (const station of list) {
      const temperature = stationTemperature(station);
      const latitude = stationLatitude(station);
      const longitude = stationLongitude(station);
      if (temperature === undefined || latitude === undefined || longitude === undefined) continue;
      const id = stationIdOf(station);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      stations.push({ latitude, longitude, temperature });
      const observedAt = stationObservedAt(station);
      if (observedAt && (!latestObservedAt || observedAt > latestObservedAt)) latestObservedAt = observedAt;
    }
  }
  if (!stations.length) throw new Error('中央氣象署目前沒有可用測站資料');
  return { stations, observedAt: latestObservedAt };
}

async function fetchObservationStationsCached(apiKey, ctx) {
  if (typeof caches !== 'undefined' && caches.default) {
    const cacheKey = new Request(`https://internal/observation-stations/${Math.floor(Date.now() / (STATION_CACHE_TTL_SECONDS * 1000))}`, { method: 'GET' });
    try {
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const payload = await cached.json();
        if (Array.isArray(payload.stations) && payload.stations.length) {
          return { stations: payload.stations, observedAt: payload.observedAt, cached: true };
        }
      }
      const result = await fetchObservationStations(apiKey);
      const response = new Response(JSON.stringify({ stations: result.stations, observedAt: result.observedAt }), {
        headers: { 'Cache-Control': `public, s-maxage=${STATION_CACHE_TTL_SECONDS}` },
      });
      ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
      return result;
    } catch {
      return fetchObservationStations(apiKey);
    }
  }
  return fetchObservationStations(apiKey);
}

// ---- IDW 插值到格點 ----
function buildTemperatureGrid(stations, bounds) {
  const cols = Math.max(2, Math.round((bounds.east - bounds.west) / GRID_RESOLUTION));
  const rows = Math.max(2, Math.round((bounds.north - bounds.south) / GRID_RESOLUTION));
  const valueGrid = new Float32Array(cols * rows);

  const n = stations.length;
  const slat = new Float64Array(n);
  const slon = new Float64Array(n);
  const stemp = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    slat[i] = stations[i].latitude;
    slon[i] = stations[i].longitude;
    stemp[i] = stations[i].temperature;
  }

  // 空間分桶，加速鄰近搜尋
  const BIN = 0.2;
  const BIN_KEY_STRIDE = 4096;
  const binToKey = (bi, bj) => bi * BIN_KEY_STRIDE + bj;
  const binIndex = new Map();
  for (let i = 0; i < n; i += 1) {
    const bi = Math.floor(slat[i] / BIN);
    const bj = Math.floor(slon[i] / BIN);
    const key = binToKey(bi, bj);
    const list = binIndex.get(key);
    if (list) list.push(i); else binIndex.set(key, [i]);
  }

  const maxRadiusDeg = MAX_IDW_RADIUS_KM / 111.0;
  const maxRadius2 = MAX_IDW_RADIUS_KM * MAX_IDW_RADIUS_KM;
  const radiusBins = Math.ceil(maxRadiusDeg / BIN);
  const landRanges = buildLandRanges(bounds, cols, rows);
  const candidateCache = new Map();

  const candidatesForBin = (centerBi, centerBj) => {
    const centerKey = binToKey(centerBi, centerBj);
    const cached = candidateCache.get(centerKey);
    if (cached) return cached;
    const candidates = [];
    for (let di = -radiusBins; di <= radiusBins; di += 1) {
      for (let dj = -radiusBins; dj <= radiusBins; dj += 1) {
        const list = binIndex.get(binToKey(centerBi + di, centerBj + dj));
        if (list) candidates.push(...list);
      }
    }
    candidateCache.set(centerKey, candidates);
    return candidates;
  };

  for (let row = 0; row < rows; row += 1) {
    const lat = bounds.north - (row + 0.5) * (bounds.north - bounds.south) / rows;
    const latRad = lat * DEG_TO_RAD;
    const cosLat = Math.cos(latRad);
    const centerBi = Math.floor(lat / BIN);
    const ranges = landRanges[row];
    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex += 2) {
      for (let col = ranges[rangeIndex]; col <= ranges[rangeIndex + 1]; col += 1) {
        const lon = bounds.west + (col + 0.5) * (bounds.east - bounds.west) / cols;
        const centerBj = Math.floor(lon / BIN);
        let weightSum = 0;
        let valueSum = 0;
        let nearest2 = Infinity;
        let nearestValue = 0;
        const candidates = candidatesForBin(centerBi, centerBj);
        for (const idx of candidates) {
          const dLat = (slat[idx] - lat) * 111.0;
          const dLon = (slon[idx] - lon) * 111.0 * cosLat;
          const d2 = dLat * dLat + dLon * dLon;
          if (d2 < nearest2) {
            nearest2 = d2;
            nearestValue = stemp[idx];
          }
          if (d2 <= maxRadius2) {
            const weight = 1 / (d2 + 0.01);
            weightSum += weight;
            valueSum += weight * stemp[idx];
          }
        }
        valueGrid[row * cols + col] = weightSum > 0 ? valueSum / weightSum : nearestValue;
      }
    }
  }
  return { valueGrid, cols, rows, landRanges };
}

// ---- PNG 編碼（沿用既有實作）----
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
function crc32(bytes) {
  let crc = 4294967295;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
    }
  }
  return (crc ^ 4294967295) >>> 0;
}
// Workers 原生 CompressionStream 產生 PNG 所需的 zlib-wrapped DEFLATE；
// 避免純 JS LZ77 壓縮耗盡 Free plan 的 10ms CPU 配額。
async function zlibDeflate(data) {
  const compressed = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}
function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const lengthBytes = new Uint8Array(4);
  new DataView(lengthBytes.buffer).setUint32(0, data.length);
  const chunkData = new Uint8Array(4 + typeBytes.length + data.length);
  chunkData.set(lengthBytes, 0);
  chunkData.set(typeBytes, 4);
  chunkData.set(data, 4 + typeBytes.length);
  const crcBytes = new Uint8Array(4);
  new DataView(crcBytes.buffer).setUint32(0, crc32(chunkData.subarray(4)));
  const result = new Uint8Array(chunkData.length + 4);
  result.set(chunkData, 0);
  result.set(crcBytes, chunkData.length);
  return result;
}
async function encodePng(width, height, pixels) {
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = new Uint8Array(height * (1 + stride));
  for (let row = 0; row < height; row += 1) {
    const rowOffset = row * (1 + stride);
    const src = row * stride;
    raw[rowOffset] = 2; // filter: Up
    for (let byteIndex = 0; byteIndex < stride; byteIndex += 1) {
      const above = row > 0 ? pixels[src - stride + byteIndex] : 0;
      raw[rowOffset + 1 + byteIndex] = (pixels[src + byteIndex] - above) & 255;
    }
  }
  const compressed = await zlibDeflate(raw);
  const chunks = [PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', new Uint8Array(0))];
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    result.set(chunk, cursor);
    cursor += chunk.length;
  }
  return result;
}

// ---- 渲染 ----
async function renderRaster(valueGrid, cols, rows, landRanges, scale) {
  const width = cols * scale;
  const height = rows * scale;
  const pixels = new Uint8Array(width * height * 4);
  for (let row = 0; row < rows; row += 1) {
    const ranges = landRanges[row];
    for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex += 2) {
      for (let col = ranges[rangeIndex]; col <= ranges[rangeIndex + 1]; col += 1) {
        const temperature = valueGrid[row * cols + col];
        if (!Number.isFinite(temperature)) continue;
        const [r, g, b] = temperatureColor(temperature);
        // 以 scale 放大此一格（真實資料在 base 格點，放大僅為像素密度）
        for (let sy = 0; sy < scale; sy += 1) {
          const targetY = row * scale + sy;
          for (let sx = 0; sx < scale; sx += 1) {
            const targetX = col * scale + sx;
            const offset = (targetY * width + targetX) * 4;
            pixels[offset] = r;
            pixels[offset + 1] = g;
            pixels[offset + 2] = b;
            pixels[offset + 3] = 255;
          }
        }
      }
    }
  }
  return encodePng(width, height, pixels);
}

// GitHub Actions / 本機批次產圖入口。HTTP Worker 不會呼叫這些函式。
export async function generateTemperatureArtifactsFromStations(stations, observedAt, source = 'CWA observation stations') {
  if (!Array.isArray(stations) || !stations.length) throw new Error('Temperature stations are required');
  const { valueGrid, cols, rows, landRanges } = buildTemperatureGrid(stations, DEFAULT_BOUNDS);
  const scale = Math.min(DEFAULT_SCALE, Math.max(1, Math.floor(MAX_OUTPUT_DIM / Math.max(cols, rows))));
  const png = await renderRaster(valueGrid, cols, rows, landRanges, scale);
  return {
    png,
    metadata: {
      ok: true,
      source,
      datasets: OBS_DATASETS,
      time: observedAt,
      stationCount: stations.length,
      generatedAt: new Date().toISOString(),
      imageKey: TEMPERATURE_PNG_KEY,
      grid: {
        resolution: GRID_RESOLUTION,
        width: cols * scale,
        height: rows * scale,
        scale,
        bounds: DEFAULT_BOUNDS,
      },
    },
  };
}

export async function generateTemperatureArtifacts(apiKey) {
  if (!apiKey) throw new Error('CWA_API_KEY is required');
  const { stations, observedAt } = await fetchObservationStations(apiKey);
  return generateTemperatureArtifactsFromStations(stations, observedAt);
}

// ---- 參數解析 ----
function parseBounds(param) {
  if (!param) return DEFAULT_BOUNDS;
  const corners = String(param).split(';').map((pair) => pair.split(',').map(Number));
  const lons = [];
  const lats = [];
  for (const [lon, lat] of corners) {
    if (Number.isFinite(lon) && Number.isFinite(lat)) { lons.push(lon); lats.push(lat); }
  }
  if (lons.length < 4) return DEFAULT_BOUNDS;
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  if (!(east > west && north > south && north - south < 10 && east - west < 10)) return DEFAULT_BOUNDS;
  return { west, south, east, north };
}

// ---- 路由 ----
const jsonResponse = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  },
});

async function r2Response(env, key, contentType, cacheControl) {
  if (!env.TEMPERATURE_ASSETS) {
    return jsonResponse({ ok: false, error: 'TEMPERATURE_ASSETS binding is not available' }, 503);
  }
  const object = await env.TEMPERATURE_ASSETS.get(key);
  if (!object) {
    return jsonResponse({ ok: false, error: 'Temperature artifact is not available yet' }, 503);
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', cacheControl);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('ETag', object.httpEtag);
  return new Response(object.body, { headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }
    if (request.method !== 'GET') return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405);

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'weather-temperature-worker', status: 'running' });
    }
    if (url.pathname === '/api/temperature/map.png') {
      return r2Response(env, TEMPERATURE_PNG_KEY, 'image/png', 'public, max-age=600, s-maxage=600');
    }
    if (url.pathname === '/api/temperature') {
      return r2Response(env, TEMPERATURE_METADATA_KEY, 'application/json; charset=utf-8', 'no-store');
    }
    return jsonResponse({ ok: false, error: 'Not Found' }, 404);
  },
};
