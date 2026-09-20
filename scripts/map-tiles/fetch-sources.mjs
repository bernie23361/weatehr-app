#!/usr/bin/env node
// Downloads the raw boundary data for the base map.
//
//   county / town : 內政部國土測繪中心 via 政府資料開放平臺 (TWD97 geographic, UTF-8)
//   land          : Natural Earth 1:50m (public domain)
//
// Writes scripts/map-tiles/.cache/sources/sources.json pointing at the .shp
// files that build-base-tiles.mjs reads.
//
// Usage: node scripts/map-tiles/fetch-sources.mjs
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DATA_GOV,
  NATURAL_EARTH,
  SOURCES_DIR,
} from './config.mjs';
import {
  download,
  ensureDir,
  exists,
  findFiles,
  unzipTo,
  writeJson,
} from './lib/io.mjs';

async function resolveDataGovUrl(id, preferredFormat) {
  const res = await fetch(`https://data.gov.tw/api/v2/rest/dataset/${id}`);
  if (!res.ok) throw new Error(`data.gov.tw dataset ${id}: HTTP ${res.status}`);
  const json = await res.json();
  const distributions = json?.result?.distribution ?? [];
  const match =
    distributions.find((d) => d.resourceFormat === preferredFormat) ??
    distributions.find((d) => typeof d.resourceDownloadUrl === 'string');
  if (!match?.resourceDownloadUrl) {
    throw new Error(`data.gov.tw dataset ${id}: no downloadable resource`);
  }
  return match.resourceDownloadUrl;
}

async function fetchShapefile({ label, zipUrl, zipName }) {
  const dir = join(SOURCES_DIR, label);
  const zipPath = join(SOURCES_DIR, zipName);
  if (!(await exists(join(dir, '.extracted')))) {
    await download(zipUrl, zipPath);
    await ensureDir(dir);
    console.log(`unzip    ${zipPath}`);
    unzipTo(zipPath, dir);
    await writeJson(join(dir, '.extracted'), { ok: true });
  }
  const candidates = await findFiles(dir, '.shp');
  if (!candidates.length) throw new Error(`${label}: no .shp found under ${dir}`);
  // Government archives can bundle a small sample shapefile next to the real
  // dataset; the main layer is the largest .shp.
  let shp = candidates[0];
  let largest = 0;
  for (const candidate of candidates) {
    const size = (await stat(candidate)).size;
    if (size > largest) {
      largest = size;
      shp = candidate;
    }
  }
  return shp;
}

async function main() {
  await ensureDir(SOURCES_DIR);

  console.log('Resolving government boundary datasets (data.gov.tw)…');
  const cityUrl = await resolveDataGovUrl(DATA_GOV.city.id, DATA_GOV.city.format);
  const townUrl = await resolveDataGovUrl(DATA_GOV.town.id, DATA_GOV.town.format);
  console.log(`  city -> ${cityUrl}`);
  console.log(`  town -> ${townUrl}`);

  const sources = {};

  sources.city = await fetchShapefile({
    label: 'city',
    zipUrl: cityUrl,
    zipName: 'city.zip',
  });
  sources.town = await fetchShapefile({
    label: 'town',
    zipUrl: townUrl,
    zipName: 'town.zip',
  });

  sources.countries = await fetchShapefile({
    label: 'ne_countries',
    zipUrl: NATURAL_EARTH.countries,
    zipName: 'ne_countries.zip',
  });
  sources.land = await fetchShapefile({
    label: 'ne_land',
    zipUrl: NATURAL_EARTH.land,
    zipName: 'ne_land.zip',
  });

  const manifestPath = join(SOURCES_DIR, 'sources.json');
  await writeJson(manifestPath, sources);
  console.log(`\nWrote ${manifestPath}`);
  for (const [key, value] of Object.entries(sources)) {
    console.log(`  ${key}: ${value}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
