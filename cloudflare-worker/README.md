# 中央氣象署 Cloudflare Worker

`cwa-weather-worker.mjs` 是即時天氣 Worker，由 wrangler 管理部署（`wrangler.cwa.jsonc`）。

## 資料流（v2：KV 快取架構）

```
定時任務（GitHub Actions，每 15 分鐘）
  └─ scripts/generate-realtime-weather.mjs   ← 抓氣象署/環境部一次，產輕量 JSON
       └─ 7 個 bundle → artifacts/realtime/*.json
            └─ wrangler kv key put ×7 → Cloudflare KV（WEATHER_REALTIME_KV）

用戶 → CDN（Cloudflare edge / Bunny.net Pull Zone）→ Worker（只讀 KV + 記憶體快取）
  └─ KV miss 時自動 fallback 回上游（首次部署 bootstrap）
```

氣象署上游每次週期只被敲一次，用戶全部讀快取。KV 寫入約 672 次/天（Free 配額 1,000）。

### KV 鍵
| Key | 內容 |
|---|---|
| `current:north` / `central` / `south` / `east` / `islands` | 各區鄉鎮 current payload + 該區測站清單 |
| `weekly:latest` | 22 縣市一週預報 |
| `air:latest` | AQI 記錄（Worker 讀取時算最近測站） |

地區分派為鄉鎮區級：`REGION_BY_CITY` 基底 + `ISLAND_DISTRICTS` 覆寫（臺東縣綠島鄉/蘭嶼鄉、屏東縣琉球鄉 → 離島；宜蘭縣 → 東部）。`data/taiwan-locations.ts` 有 368 個鄉鎮，`cloudflare-worker` 內的 `DISTRICTS_BY_CITY` 與其鏡像同步。

## 為什麼定時任務放 GitHub Actions？

Workers **Free 方案每次呼叫 CPU 上限 10ms**（含 Cron Trigger），不夠做上游抓取與組包；因此重運算放 GitHub runner（與溫度格點圖 `.github/workflows/temperature-map.yml` 相同模式）。若升級 Workers **Paid**（Cron CPU 30s），可改用 Worker 內建的 `scheduled()` handler + `triggers.crons`，程式碼已預留（`buildRealtimeBundles` 與 `scheduled` 已 export）。

## 安全設定

中央氣象署授權碼與環境部授權碼只能存於 Secret，名稱必須是 `CWA_API_KEY` 與 `MOENV_API_KEY`。程式中不可出現實際授權碼。

## 路由

- `GET /health`：健康檢查（含 KV lastGeneratedAt）。
- `GET /weather/current?city=臺中市&district=北區`：即時觀測、日出日沒與未來六小時。
- `GET /weather/weekly?city=臺中市&district=北區`：使用 `F-D0047-091` 取得所在地縣市未來一週逐 12 小時預報；`district` 僅保留介面一致性。
- `GET /weather/observation?county=臺中市`：全台測站即時觀測清單（可選 `county` 篩選）。
- `GET /air-quality?latitude=25.03&longitude=121.56`：最近 AQI 測站。
- `OPTIONS`：Expo Web／瀏覽器預檢請求。

成功回應由 KV 提供時為快取命中（`X-Worker-Cache: HIT`）；`current`/`observation` 快取 600 秒、`weekly`/`air` 3600 秒。錯誤回應不快取，也不會向客戶端暴露氣象署或 Secret 的詳細錯誤。

## 初始化與部署

```powershell
# 1. 建立 KV namespace（只需一次），取得 id
npx wrangler kv namespace create WEATHER_REALTIME_KV
#    把回傳的 id 填入 wrangler.cwa.jsonc 的 kv_namespaces[].id

# 2. 設定 secrets
npx wrangler secret put CWA_API_KEY --config wrangler.cwa.jsonc
npx wrangler secret put MOENV_API_KEY --config wrangler.cwa.jsonc

# 3. 部署（name 必須與既有 worker 同名，才能接管同一 script、維持 URL 不變）
npx wrangler deploy --config wrangler.cwa.jsonc
```

GitHub repository secrets（`realtime-weather.yml` 使用）：

- `CWA_API_KEY`
- `MOENV_API_KEY`
- `WEATHER_KV_NAMESPACE_ID`（KV namespace id）
- `CLOUDFLARE_API_TOKEN`（需有 KV 寫入權限）
- `CLOUDFLARE_ACCOUNT_ID`

先手動跑一次 `Generate realtime weather bundles` workflow，確認 KV 有資料後再驗證 `/weather/current`、`/weather/weekly`、`/weather/observation`、`/air-quality`。

## CDN（Bunny.net，選配）

在 Bunny.net 建立 Pull Zone，origin 設為 Worker 的 `*.workers.dev` URL，並依下表設定快取：

- `/weather/current`、`/weather/observation` → TTL 600 秒
- `/weather/weekly`、`/air-quality` → TTL 3600 秒

再把 App 的 `EXPO_PUBLIC_CWA_WORKER_URL` 指到 Bunny Pull Zone hostname。不開 Bunny 時 Cloudflare edge 也會依 `Cache-Control` 快取。

## 溫度格點圖批次架構（獨立）

`weather-temperature-worker.mjs`（`wrangler.jsonc`）由 GitHub Actions（`.github/workflows/temperature-map.yml`）產圖後上傳 R2，細節見該檔與 `scripts/generate-temperature-map.mjs`。