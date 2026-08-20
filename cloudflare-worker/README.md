# 中央氣象署 Cloudflare Worker

`cwa-weather-worker.mjs` 是 Cloudflare Dashboard「Edit code」可直接使用的 Worker 程式。

## 安全設定

中央氣象署授權碼只能存於 Cloudflare Secret，名稱必須是 `CWA_API_KEY`。程式中不可出現實際授權碼。

## 路由

- `GET /health`：健康檢查。
- `GET /weather/current?city=臺中市&district=北區`：即時觀測、日出日沒與未來六小時。
- `GET /weather/observation?county=臺中市`：全台測站即時觀測清單（可選 `county` 篩選）。
- `OPTIONS`：Expo Web／瀏覽器預檢請求。

成功回應快取五分鐘。錯誤回應不快取，也不會向客戶端暴露中央氣象署或 Secret 的詳細錯誤。

## Dashboard 部署

1. 確認舊授權碼已在中央氣象署後台撤銷。
2. 將新授權碼存入 Cloudflare Secret `CWA_API_KEY`。
3. 把 `cwa-weather-worker.mjs` 全文貼入 Edit code。
4. 按 Deploy。
5. 先開啟 `/health`，再測試 `/weather/current?city=臺中市&district=北區`。
