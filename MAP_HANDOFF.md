# 地圖工作交接清單（給 ChatGPT Codex）

> 本文件說明「Weather APP」專案中，地圖部分已完成/未完成/注意事項，供接手者快速掌握。
> 專案根目錄：`weather-expo/`（Expo React Native，TypeScript，路徑別名 `@/` → 根目錄）。

## A. 已完成並驗證的部分（可直接用）

### 新增檔案

| 檔案 | 內容 |
|---|---|
| `data/taiwan-islands.ts` | 新的輕量臺灣 SVG 島嶼資料（~10KB）。`taiwanIslands: TaiwanIsland[]`（10 組：taiwan, penghu, kinmen, matsu, green-island, orchid-island, turtle-island, hsiao-liuchiu, dongsha, taiping；釣魚台島礁含在 taiwan 組）。`MAIN_GROUP_BBOX`（進入畫面取景框）。座標用等距圓柱投影（原點 119.588365E / 25.568857N，140 units/度），與 `projectCoordinates` 一致。已用像素統計驗證「無縫、無破洞」。 |
| `data/country-png-meta.ts` | `countryPngs: CountryPngMeta[]`（china / north-korea / south-korea / japan / philippines），每個含 `bounds {x,y,width,height}`（viewBox 單位）。PNG 放在 `assets/maps/countries/*.png`（5 張、共約 234KB、透明底、填色 `#DCE6EF`）。 |
| `components/taiwan-map.tsx` | 新地圖元件 `TaiwanMap`，props `{allowTap?, children?}`；同時 export `TaiwanMapOverlayArgs {surfaceWidth, surfaceHeight, viewBox}`。 |
| `assets/maps/countries/*.png` | 5 個國家的高解析小 PNG。 |

### `components/taiwan-map.tsx` 實作要點（修改常數都在檔頂）

- 世界 viewBox：`WORLD_BOUNDS = {minX:-6600, minY:-2900, maxX:3800, maxY:3000}`（涵蓋所有國家 PNG 與臺灣所有島嶼，含東沙 y≈681、太平島 y≈2127）。
- 渲染順序：先畫國家 PNG（`SvgImage` + `preserveAspectRatio="none"` 放在各自 bounds）→ 再畫臺灣島嶼（每個 ring 是獨立 `<Path>`，fill `#DCE6EF`、stroke `#8FA6BB` 0.9）。
- 進入畫面：以 `MAIN_GROUP_BBOX` 中心對齊、島群高度佔畫面約 90%（`ENTRY_HEIGHT_RATIO=0.9`）。
- 縮放限制：`MIN_SCALE=0.12`（縮到最遠約見附近國家一半）、`MAX_SCALE=5`（縮到最近達鄉鎮級）。可平移/雙指縮放，並被 clamp 在世界範圍內。
- 底部海色 `#E8F0F8`。

### 修改的既有檔案

- `screens/weather-observation-screen.tsx`：改用 `import { TaiwanMap, type TaiwanMapOverlayArgs } from '@/components/taiwan-map'`；`<RegionalMap allowTap>{overlay}</RegionalMap>` → `<TaiwanMap allowTap>{overlay}</TaiwanMap>`。overlay（測站、雷達、公路）仍用 `projectCoordinates`，與新 viewBox 對齊。
- `screens/disaster-map-screen.tsx`：`RegionalMap` → `TaiwanMap`（無 overlay）。
- `data/taiwan-map-projection.ts`：`projectCoordinates(lat,lng)` 保留不變（觀測 overlay 與公路共用）。
- `package.json`：`"typecheck": "node --stack-size=8192 node_modules/typescript/lib/tsc.js --noEmit"`。原因：tsc 5.9.3 在 Node 24 上跑此專案會 `Maximum call stack size exceeded`，加 stack 後正常。

### 刪除的舊地圖內容

- 資料：`data/taiwan-map.ts`、`data/taiwan-offshore-map.ts`、`data/regional-country-outlines.ts`、`data/china-outline.ts`
- 元件/常數：`components/regional-map.tsx`、`constants/map-assets.ts`（`constants/` 現為空資料夾）
- CDN：`cdn/`（整夾）、`.env`（原只有 `EXPO_PUBLIC_MAP_CDN_BASE_URL`）
- 腳本：`scripts/generate-earthquake-map-svg.cjs`、`scripts/generate-regional-country-outlines.cjs`、`scripts/generate-taiwan-map.cjs`
- 暫存：`.wrangler/`

### 已做的驗證

- `npm.cmd run typecheck` → **通過（無錯誤）**。
- `npx.cmd expo export -p web` → **打包成功**。
- 島嶼 SVG 資料 → 像素統計確認無破洞、10 組島嶼齊全、779 個簡化點。

---

## B. 已完成但「尚未視覺驗證」的部分（接手者要實際開 App 確認）

前手無法讀圖，只做到「編譯/打包通過 + 資料數值驗證」。下列需要跑起來確認：

1. 開啟「天氣觀測」頁：台灣地圖是否正常顯示、測站圓點是否落在台灣上、雷達圖層位置、公路圖層、圖層切換（溫度/雨量/風力/濕度/能見度）。
2. 進入畫面取景比例（台灣約佔畫面 90% 高度）是否合適；縮放上下限的手感（MIN_SCALE / MAX_SCALE）。
3. 縮小看中/日/菲/韓時，國家 PNG 位置與顏色是否正確、與臺灣 SVG 對齊。
4. Web 與原生兩種平台的渲染（`SvgImage` + `require(本地PNG)` 在 web 上是否正常）。
5. 拖曳/雙指縮放手勢是否順暢。

---

## C. 已知注意事項

1. **資料來源**：`taiwan-islands.ts` 是從「已刪除的內政部縣市資料 + 已刪除的產生腳本 + 已移除的 `@resvg/resvg-js`」產生的。**請把這兩個產出的資料檔當成唯一來源**；要重產生需先 `git checkout` 還原舊資料與腳本並重裝 `@resvg/resvg-js`（不建議）。
2. `taiwan` 組包含釣魚台島礁（x 到 ~574），會依正確座標渲染，但在進入取景框外（刻意）。
3. 東沙（y≈681）、太平島（y≈2127）有包含，縮小時才看得到（刻意）。
4. `components/taiwan-map.tsx` 檔頂的 `WORLD_BOUNDS / MIN_SCALE / MAX_SCALE / ENTRY_HEIGHT_RATIO / 顏色` 都是常數，微調容易。
5. `git status` 有**很多不是地圖工作造成的**既有變更（`app.json`、部分 `assets/weather-*.png` 被刪、`cloudflare-worker/`、`services/*`、`components/*`、`screens/weather-home-screen.tsx` 等）——那是先前就存在的未提交狀態，**請勿還原**。地圖工作實際動到的只有 A 段列的檔案。
6. 專案根的 `.codex-expo-web.log`、`.codex-expo-web.err.log` 是先前跑 Codex 留下的，與地圖無關。
7. `dist/` 是測試 `expo export` 產生的（已在 .gitignore，可刪）。
8. `@resvg/resvg-js` 已完全移除（`package.json` 與 `pnpm-lock.yaml` 均無殘留）。
9. 氣象 API（`services/weather-api.ts` 的 `EXPO_PUBLIC_CWA_WORKER_URL` / cloudflare worker）與地圖無關，**不要動**。

---

## D. 建議的下一步

1. `npm.cmd run web`（或 `npm.cmd start`）→ 開「天氣觀測」頁驗證 B 段各項。
2. 依實際畫面調整 `components/taiwan-map.tsx` 檔頂常數。
3. 檢查 web 上國家 PNG（SvgImage）渲染。
4. 可刪空的 `constants/` 資料夾與 `dist/`。
5. 每次改完跑 `npm.cmd run typecheck`（已含 stack 修正）。
