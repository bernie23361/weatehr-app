# 中央氣象署 Cloudflare Worker

`cwa-weather-worker.mjs` 是 Cloudflare Dashboard「Edit code」可直接使用的 Worker 程式。

## 安全設定

中央氣象署授權碼只能存於 Cloudflare Secret，名稱必須是 `CWA_API_KEY`。程式中不可出現實際授權碼。

## 路由

- `GET /health`：健康檢查。
- `GET /weather/current?city=臺中市&district=北區`：即時觀測、日出日沒與未來六小時。
- `GET /weather/weekly?city=臺中市&district=北區`：使用 `F-D0047-091` 取得所在地縣市未來一週逐 12 小時預報；`district` 僅保留介面一致性。
- `GET /weather/observation?county=臺中市`：全台測站即時觀測清單（可選 `county` 篩選）。
- `OPTIONS`：Expo Web／瀏覽器預檢請求。

成功回應快取五分鐘。錯誤回應不快取，也不會向客戶端暴露中央氣象署或 Secret 的詳細錯誤。

## 溫度格點圖批次架構

`weather-temperature-worker.mjs` 的 HTTP 請求不再執行 IDW 或 PNG 壓縮，只從 R2 bucket
`weather-temperature-assets` 串流以下成品：

- `temperature/latest.png`：最新全臺溫度格點圖。
- `temperature/latest.json`：觀測時間、測站數與格點資訊。

`.github/workflows/temperature-map.yml` 會在中央氣象署每 10 分鐘更新後延遲 3 分鐘執行：

1. 一次批次工作並行取得 `O-A0003-001` 與 `O-A0001-001`。
2. 在 GitHub runner 完成全部 IDW 與 PNG 壓縮。
3. 先上傳 PNG，最後上傳 metadata 至 R2。

GitHub repository secrets：

- `CWA_API_KEY`
- `CLOUDFLARE_API_TOKEN`（需有目標帳號的 R2 Object Read & Write 權限）
- `CLOUDFLARE_ACCOUNT_ID`

Cloudflare 初始化與部署：

```powershell
npx wrangler r2 bucket create weather-temperature-assets
npx wrangler deploy
```

可在 GitHub Actions 手動執行 `Generate temperature map`，先建立第一組 R2 成品，再開啟 App 的溫度 PNG 載入開關。

App 預設會嘗試取得格點 metadata；在 R2 成品尚未建立或暫時無法取得時，會自動退回測站點位。若要刻意停用格點圖，可設定 `EXPO_PUBLIC_TEMPERATURE_GRID_ENABLED=false`。

## Dashboard 部署

1. 確認舊授權碼已在中央氣象署後台撤銷。
2. 將新授權碼存入 Cloudflare Secret `CWA_API_KEY`。
3. 把 `cwa-weather-worker.mjs` 全文貼入 Edit code。
4. 按 Deploy。
5. 先開啟 `/health`，再測試 `/weather/current?city=臺中市&district=北區` 與 `/weather/weekly?city=臺中市&district=北區`。
