#!/usr/bin/env node
// Downloads the seamless 20m DTM archives (main island, Penghu, Kinmen) listed
// by the 內政部地政司 open-data index and extracts them.
//
// Output: scripts/map-tiles/.cache/sources/dtm/<archive>/**/*.grd (+ .hdr)
//         scripts/map-tiles/.cache/sources/dtm.json
//
// Usage: node scripts/map-tiles/fetch-dtm.mjs
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DTM_ARCHIVE_MATCHERS, DTM_INDEX_URL, SOURCES_DIR } from './config.mjs';
import { download, ensureDir, exists, unzipTo, writeJson } from './lib/io.mjs';

// Index CSV columns: 圖資名稱,製作說明,圖資類型,圖資坐標系統,年度,連結網址
const NAME_COLUMN = 0;
const URL_COLUMN = 5;

function archiveLabel(name) {
  if (name.includes('澎湖')) return 'penghu';
  if (name.includes('金門')) return 'kinmen';
  return 'taiwan';
}

async function main() {
  await ensureDir(SOURCES_DIR);

  const indexCsv = join(SOURCES_DIR, 'dtm-index.csv');
  await download(DTM_INDEX_URL, indexCsv);
  const text = (await readFile(indexCsv, 'utf8')).replace(/^\uFEFF/, '');

  const targets = [];
  for (const line of text.split(/\r?\n/)) {
    const columns = line.split(',');
    if (columns.length <= URL_COLUMN) continue;
    const name = columns[NAME_COLUMN].trim();
    const url = columns[URL_COLUMN].trim();
    if (!DTM_ARCHIVE_MATCHERS.some((matcher) => name.includes(matcher))) continue;
    targets.push({ label: archiveLabel(name), url });
  }

  if (!targets.length) throw new Error('No matching DTM archives found in index');

  const manifest = {};
  for (const { label, url } of targets) {
    const dir = join(SOURCES_DIR, 'dtm', label);
    const zipPath = join(SOURCES_DIR, `dtm-${label}.zip`);
    if (!(await exists(join(dir, '.extracted')))) {
      console.log(`\nDTM ${label}: ${url}`);
      await download(url, zipPath);
      await ensureDir(dir);
      console.log(`unzip    ${zipPath}`);
      unzipTo(zipPath, dir);
      await writeJson(join(dir, '.extracted'), { ok: true });
    }
    manifest[label] = dir;
  }

  const manifestPath = join(SOURCES_DIR, 'dtm.json');
  await writeJson(manifestPath, manifest);
  console.log(`\nWrote ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
