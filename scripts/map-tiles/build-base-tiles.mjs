#!/usr/bin/env node
// Builds the base vector tiles (source-layers `land` / `county` / `town`) from
// the shapefiles fetched by fetch-sources.mjs.
//
//   shapefile -> GeoJSON -> geojson-vt -> vt-pbf -> {z}/{x}/{y}.pbf
//
// Output: scripts/map-tiles/.cache/tiles/base/{z}/{x}/{y}.pbf
//
// Usage: node scripts/map-tiles/build-base-tiles.mjs
import { rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import geojsonvt from 'geojson-vt';
import * as shapefile from 'shapefile';
import vtpbf from 'vt-pbf';
import {
  BASE_MAX_ZOOM,
  BASE_TILES_DIR,
  LAYERS,
  SOURCES_DIR,
} from './config.mjs';
import { ensureDir, readJson } from './lib/io.mjs';
import { tileRangeForBounds } from './lib/tile-math.mjs';

async function readShapefile(shpPath, encoding) {
  const dbfPath = shpPath.slice(0, -extname(shpPath).length) + '.dbf';
  const geojson = await shapefile.read(shpPath, dbfPath, { encoding });
  return geojson;
}

function mapProperties(featureCollection, pick) {
  return {
    type: 'FeatureCollection',
    features: featureCollection.features
      .map((feature) => ({
        type: 'Feature',
        geometry: feature.geometry,
        properties: pick(feature.properties ?? {}),
      }))
      .filter((feature) => feature.geometry),
  };
}

function vtIndex(featureCollection, maxZoom) {
  return geojsonvt(featureCollection, {
    maxZoom,
    indexMaxZoom: Math.min(maxZoom, 5),
    tolerance: 3,
    extent: 4096,
    buffer: 64,
  });
}

function countPoints(featureCollection) {
  let total = 0;
  const walk = (coords) => {
    if (typeof coords[0] === 'number') {
      total += 1;
      return;
    }
    for (const child of coords) walk(child);
  };
  for (const feature of featureCollection.features) {
    if (feature.geometry?.coordinates) walk(feature.geometry.coordinates);
  }
  return total;
}

async function main() {
  const sources = await readJson(join(SOURCES_DIR, 'sources.json'));

  console.log('Reading shapefiles…');
  const [countyRaw, townRaw, landRaw] = await Promise.all([
    readShapefile(sources.city, 'utf-8'),
    readShapefile(sources.town, 'utf-8'),
    readShapefile(sources.countries, 'latin1'),
  ]);

  const county = mapProperties(countyRaw, (p) => ({
    NAME: String(p.COUNTYNAME ?? ''),
    CODE: String(p.COUNTYCODE ?? ''),
  }));
  const town = mapProperties(townRaw, (p) => ({
    NAME: String(p.TOWNNAME ?? ''),
    CODE: String(p.TOWNCODE ?? ''),
  }));
  const land = mapProperties(landRaw, (p) => ({
    NAME: String(p.NAME ?? p.NAME_LONG ?? ''),
  }));

  console.log(
    `  county:  ${county.features.length} features / ${countPoints(county)} pts`,
  );
  console.log(
    `  town:    ${town.features.length} features / ${countPoints(town)} pts`,
  );
  console.log(
    `  land:    ${land.features.length} features / ${countPoints(land)} pts`,
  );

  console.log(`\nRemoving stale tiles at ${BASE_TILES_DIR}`);
  await rm(BASE_TILES_DIR, { recursive: true, force: true });

  const indexes = {
    land: vtIndex(land, LAYERS.land.maxZoom),
    county: vtIndex(county, LAYERS.county.maxZoom),
    town: vtIndex(town, LAYERS.town.maxZoom),
  };

  let grandTotal = 0;
  for (let z = 0; z <= BASE_MAX_ZOOM; z += 1) {
    // x/y -> layer-name -> geojson-vt tile.
    const tiles = new Map();
    for (const [name, layer] of Object.entries(LAYERS)) {
      if (z < layer.minZoom || z > layer.maxZoom) continue;
      const { minX, maxX, minY, maxY } = tileRangeForBounds(layer.bounds, z);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          const tile = indexes[name].getTile(z, x, y);
          if (!tile?.features?.length) continue;
          const key = `${x}/${y}`;
          const bucket = tiles.get(key) ?? {};
          bucket[name] = tile;
          tiles.set(key, bucket);
        }
      }
    }

    for (const [key, layers] of tiles) {
      const [x, y] = key.split('/');
      const buffer = Buffer.from(vtpbf.fromGeojsonVt(layers, { version: 2 }));
      const out = join(BASE_TILES_DIR, String(z), x, `${y}.pbf`);
      await ensureDir(dirname(out));
      await writeFile(out, buffer);
    }

    grandTotal += tiles.size;
    console.log(`  z${z}: ${tiles.size} tiles`);
  }

  console.log(`\nDone. ${grandTotal} tiles written to ${BASE_TILES_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
