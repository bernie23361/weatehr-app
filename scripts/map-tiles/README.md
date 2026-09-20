# 自製地圖圖磚管線（map-tiles）

用政府開放資料與 Natural Earth 自製向量底圖（`land` / `county` / `town`），
以及內政部 20m DTM 產生的地形 hillshade。純 Node，不需要 Docker／GDAL。

## 產物

| 產物 | 來源 | 圖磚 |
|---|---|---|
| `base` 向量磚 | Natural Earth 1:50m（`land`）＋ 內政部國土測繪中心縣市/鄉鎮界（`county`/`town`） | `{z}/{x}/{y}.pbf` |
| `terrain` 地形磚 | 內政部地政司 2025 年版 20m DTM | `{z}/{x}/{y}.png`（Mapbox Terrain-RGB） |

source-layer 是自有命名（`land`/`county`/`town`），style 的向量 source id 為
`weathertas-map`（見 `components/taiwan-map.tsx`）。資料授權：政府資料開放授權
條款第1版、Natural Earth 公眾領域。

> DTM 的「不分幅」無縫檔（全台/澎湖/金門）是 **GeoTIFF（`.tif`＋`.tfw`）**，
> 「分幅」檔則是 `.grd` 文字網格；地形腳本兩種格式都支援，依副檔名自動判斷。

## 流程

```bash
# 1. 下載界線資料（縣市、鄉鎮、Natural Earth）
npm run map:fetch

# 2. 產生 base 向量磚 -> scripts/map-tiles/.cache/tiles/base/
npm run map:base

# 3. 下載 DTM（全台、澎湖、金門；檔案較大）
npm run map:dtm

# 4. 產生地形磚 -> scripts/map-tiles/.cache/tiles/terrain/
npm run map:terrain

# 5. 上傳到 R2（需先設定環境變數，見下）
npm run map:upload -- --kind base
npm run map:upload -- --kind terrain
```

所有原始資料與產物都放在 `scripts/map-tiles/.cache/`（已 gitignore），可重跑。

## 上傳 R2

建立一個 R2 bucket（預設名稱 `weather-map-tiles`），並準備 S3 API token：

```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=weather-map-tiles   # 選填
```

物件路徑：`base/{z}/{x}/{y}.pbf`、`terrain/{z}/{x}/{y}.png`。

## Worker

`cloudflare-worker/map-tiles-worker.mjs` 從 R2 讀圖磚，並用 Cloudflare 邊緣
快取（Cache API）擋住重複請求——每個圖磚回源 R2 一次，之後由快取供應。R2 對外
流量免費，所以成本主要由儲存與極少的 Class B 讀取構成。

部署：

```bash
npx wrangler deploy --config wrangler.map.jsonc
```

> 請用 **自訂網域** 綁定 Worker／R2，不要用 `r2.dev` 直連（不經邊緣快取，
> 每張圖磚都會計為一次 R2 讀取）。

## 接到 App

在 `.env`（或 EAS 環境變數）設定，未設定時沿用 ExpTech 圖磚：

```bash
# 例：https://tiles.example.com/base/{z}/{x}/{y}.pbf
EXPO_PUBLIC_MAP_TILE_URL=
# 選填；有設才會加入地形 hillshade
EXPO_PUBLIC_MAP_TERRAIN_URL=
```

App 內不顯示標註（會被底部導航遮住）；來源資訊保留在 style 與 Worker 回應，
之後在設定頁的「第三方及授權」區塊統一呈現。

## 預留：街道／建築

未來新增 OSM/OpenMapTiles 派生圖磚時，可比照 ExpTech 的雙來源架構，另外提供
一組 `detail/{z}/{x}/{y}.pbf`，在 `taiwan-map.tsx` 的 `sources` 增加一個來源並
把圖層插在 `town-fill` 與 `town-outline` 之間即可，不必動現有 `base` 管線。
