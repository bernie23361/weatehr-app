// Shared configuration for the self-hosted map tile pipeline.
//
// Everything the other scripts need to agree on lives here: where artifacts go,
// which zoom ranges each source-layer covers, and where the raw data comes from.
// Source-layer names are our own (`land` / `county` / `town`); the style's vector
// source id is `weathertas-map` (see components/taiwan-map.tsx).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = join(SCRIPT_DIR, '..', '..');
export const CACHE_DIR = join(SCRIPT_DIR, '.cache');
export const SOURCES_DIR = join(CACHE_DIR, 'sources');
export const TILES_DIR = join(CACHE_DIR, 'tiles');
export const BASE_TILES_DIR = join(TILES_DIR, 'base');
export const TERRAIN_TILES_DIR = join(TILES_DIR, 'terrain');

// [west, south, east, north] in degrees, WGS84.
export const WORLD_BOUNDS = [-180, -85.05112878, 180, 85.05112878];
export const TAIWAN_BOUNDS = [118.0, 21.8, 122.1, 25.4];

// Highest native zoom. MapLibre overzooms the last native tile past this, so the
// camera can still reach the app's maxZoom (16) without blurry gaps.
export const BASE_MAX_ZOOM = 10;
export const TERRAIN_MAX_ZOOM = 12;

// Per source-layer zoom window and the geographic area it is generated over.
// `land` is the world landmass fill; `county` / `town` are Taiwan only.
export const LAYERS = {
  land: { minZoom: 0, maxZoom: 5, bounds: WORLD_BOUNDS },
  county: { minZoom: 4, maxZoom: BASE_MAX_ZOOM, bounds: TAIWAN_BOUNDS },
  town: { minZoom: 6, maxZoom: BASE_MAX_ZOOM, bounds: TAIWAN_BOUNDS },
};

// Government open data (政府資料開放平臺 / 內政部國土測繪中心). The download URLs
// carry Chinese characters, so they are resolved from the API at runtime rather
// than hard-coded.
export const DATA_GOV = {
  // 直轄市、縣市界線(TWD97經緯度) — county / city boundaries.
  city: { id: '7442', format: 'SHP' },
  // 鄉(鎮、市、區)界線(TWD97經緯度) — township / district boundaries.
  town: { id: '7441', format: 'SHP' },
};

// Natural Earth 1:50m — public domain, small enough for zoom 0–5.
export const NATURAL_EARTH = {
  countries:
    'https://naturalearth.s3.amazonaws.com/50m_cultural/ne_50m_admin_0_countries.zip',
  land: 'https://naturalearth.s3.amazonaws.com/50m_physical/ne_50m_land.zip',
};

// 2025 年版全台 20m DTM CSV index (內政部地政司, 政府資料開放授權條款第1版).
export const DTM_INDEX_URL =
  'https://opdadm.moi.gov.tw/api/v1/no-auth/resource/api/dataset/A964612F-0D64-4C81-BFE5-6C1F2BA61DED/resource/A0B94F67-8ADF-48A1-8DF0-C60719AD2B28/download';

// The DTM index lists one zip per county plus three seamless archives. We only
// need the seamless ones (main island, Penghu, Kinmen). Match on the 圖資名稱
// column; note the main-island entry is named 「不分幅_台灣20MDEM」 while its
// file is 「不分幅_全台20MDEM」.
export const DTM_ARCHIVE_MATCHERS = [
  '不分幅_台灣20MDEM',
  '不分幅_澎湖20MDEM',
  '不分幅_金門20MDEM',
];
