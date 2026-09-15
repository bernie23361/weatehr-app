// scripts/generate-realtime-weather.mjs
//
// 即時天氣 producer：抓取中央氣象署與環境部資料一次，產出輕量 JSON bundle，
// 供 GitHub Actions 以 `wrangler kv key put` 寫入 Cloudflare KV（WEATHER_REALTIME_KV）。
//
// 輸出：artifacts/realtime/{current-north,current-central,current-south,current-east,current-islands,weekly-latest,air-latest}.json
// 檔名以 '-' 取代 KV key 的 ':'；上傳 workflow 再轉回 ':' 當 KV key。
//
// 用法：CWA_API_KEY=<key> [MOENV_API_KEY=<key>] node scripts/generate-realtime-weather.mjs [輸出目錄]

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildRealtimeBundles } from '../cloudflare-worker/cwa-weather-worker.mjs';

const apiKey = process.env.CWA_API_KEY;
const moenvKey = process.env.MOENV_API_KEY;
if (!apiKey) throw new Error('CWA_API_KEY is required');

const outputDirectory = resolve(process.argv[2] || 'artifacts/realtime');

const bundles = await buildRealtimeBundles({ CWA_API_KEY: apiKey, MOENV_API_KEY: moenvKey });

await mkdir(outputDirectory, { recursive: true });

const written = {};
await Promise.all(Object.entries(bundles).map(async ([key, value]) => {
  const filename = `${key.replaceAll(':', '-')}.json`;
  await writeFile(resolve(outputDirectory, filename), JSON.stringify(value));
  written[key] = filename;
}));

console.log(JSON.stringify({
  event: 'realtime_bundles_generated',
  outputDirectory,
  keys: Object.keys(written),
  files: written,
}));