#!/usr/bin/env node
// Builds Mapbox Terrain-RGB PNG tiles from the 20m DTM.
//
// Sources can be either:
//   * GeoTIFF  — the seamless archives (DEM_*_V2025.tif) from the open-data
//     index. Read via `geotiff`, georeferenced by their internal geotags.
//   * `.grd`   — the per-county text grids ("E N H" per line, TWD97 TM2).
//
// Output: scripts/map-tiles/.cache/tiles/terrain/{z}/{x}/{y}.png
// Consumed by MapLibre as `raster-dem` with `encoding: "mapbox"`.
//
// Usage: node scripts/map-tiles/build-terrain-tiles.mjs [--max-zoom 12]
import { rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fromFile } from 'geotiff';
import { PNG } from 'pngjs';
import proj4 from 'proj4';
import {
  SOURCES_DIR,
  TAIWAN_BOUNDS,
  TERRAIN_MAX_ZOOM,
  TERRAIN_TILES_DIR,
} from './config.mjs';
import { ensureDir, findFiles, readJson } from './lib/io.mjs';
import { tileBounds, tileRangeForBounds } from './lib/tile-math.mjs';

// TWD97 / TM2 zone 121 (EPSG:3826). GRS80, scale factor 0.9999.
const TWD97_TM2 =
  '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const WGS84 = 'WGS84';

const TILE_SIZE = 256;
const MAX_ENCODED = 2 ** 24 - 1;
// Any cell at/below this is treated as no-data. Taiwan's DTM never legitimately
// drops below −100 m, so this safely absorbs float-noise around the −32767
// sentinel without clipping real elevation.
const NO_DATA_THRESHOLD = -100;
// Coarse-grid cell size (source pixels) used to inpaint interior DTM voids.
const INPAINT_BLOCK = 40;

function toWgs84(easting, northing) {
  const [lon, lat] = proj4(TWD97_TM2, WGS84, [easting, northing]);
  return [lon, lat];
}

/**
 * A tiled elevation source. `heightAt` returns a finite elevation (meters) for
 * an Easting/Northing in TWD97 TM2, or `null` outside the source's coverage.
 */
class ElevationSource {
  constructor({ minX, minY, maxX, maxY, sampleAt }) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
    this.sampleAt = sampleAt;
  }

  contains(easting, northing) {
    return (
      easting >= this.minX &&
      easting <= this.maxX &&
      northing >= this.minY &&
      northing <= this.maxY
    );
  }

  heightAt(easting, northing) {
    return this.contains(easting, northing)
      ? this.sampleAt(easting, northing)
      : null;
  }
}

/** Read a full GeoTIFF band into memory and expose bilinear sampling. */
async function loadGeoTiff(path) {
  const tiff = await fromFile(path);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const [minX, minY, maxX, maxY] = image.getBoundingBox();
  const data = (await image.readRasters())[0];
  const noData = Number(image.fileDirectory?.GDAL_NODATA);
  const hasNoData = Number.isFinite(noData);

  const isVoid = (v) =>
    !Number.isFinite(v) ||
    v <= NO_DATA_THRESHOLD ||
    (hasNoData && Math.abs(v - noData) < 1e-6);

  // The government DTM has genuine voids over land (a ~140 km² hole near
  // Hsinchu/Miaoli, plus a few 1 km² ones). Build a coarse grid, classify
  // sea-connected voids (stay empty) vs interior voids (inpainted from the
  // surrounding land), and fall back to it whenever the native samples are void.
  const F = INPAINT_BLOCK;
  const cw = Math.ceil(width / F);
  const ch = Math.ceil(height / F);
  const sum = new Float64Array(cw * ch);
  const count = new Int32Array(cw * ch);
  for (let y = 0; y < height; y += 1) {
    const cy = (y / F) | 0;
    for (let x = 0; x < width; x += 1) {
      const v = data[y * width + x];
      if (isVoid(v)) continue;
      const k = cy * cw + ((x / F) | 0);
      sum[k] += v;
      count[k] += 1;
    }
  }
  const coarse = new Float32Array(cw * ch).fill(NaN);
  const valid = new Uint8Array(cw * ch);
  for (let k = 0; k < cw * ch; k += 1) {
    if (count[k] > 0) {
      coarse[k] = sum[k] / count[k];
      valid[k] = 1;
    }
  }
  // Flood-fill void cells reachable from the border = sea; only the rest is
  // interior and worth filling.
  const sea = new Uint8Array(cw * ch);
  const queue = [];
  const pushSea = (r, c) => {
    if (r < 0 || c < 0 || r >= ch || c >= cw) return;
    const k = r * cw + c;
    if (!valid[k] && !sea[k]) {
      sea[k] = 1;
      queue.push(k);
    }
  };
  for (let c = 0; c < cw; c += 1) {
    pushSea(0, c);
    pushSea(ch - 1, c);
  }
  for (let r = 0; r < ch; r += 1) {
    pushSea(r, 0);
    pushSea(r, cw - 1);
  }
  while (queue.length) {
    const k = queue.pop();
    const r = (k / cw) | 0;
    const c = k % cw;
    pushSea(r - 1, c);
    pushSea(r + 1, c);
    pushSea(r, c - 1);
    pushSea(r, c + 1);
  }
  for (let pass = 0; pass < 60; pass += 1) {
    let filled = 0;
    const next = Float32Array.from(coarse);
    for (let r = 0; r < ch; r += 1) {
      for (let c = 0; c < cw; c += 1) {
        const k = r * cw + c;
        if (valid[k] || sea[k]) continue;
        let total = 0;
        let n = 0;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= ch || nc >= cw) continue;
          const value = coarse[nr * cw + nc];
          if (!Number.isNaN(value)) {
            total += value;
            n += 1;
          }
        }
        if (n) {
          next[k] = total / n;
          filled += 1;
        }
      }
    }
    for (let k = 0; k < cw * ch; k += 1) coarse[k] = next[k];
    if (!filled) break;
  }

  const coarseAt = (fx, fy) => {
    const gx = Math.min(cw - 1, Math.max(0, fx / F - 0.5));
    const gy = Math.min(ch - 1, Math.max(0, fy / F - 0.5));
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, cw - 1);
    const y1 = Math.min(y0 + 1, ch - 1);
    const tx = gx - x0;
    const ty = gy - y0;
    const a = coarse[y0 * cw + x0];
    const b = coarse[y0 * cw + x1];
    const c = coarse[y1 * cw + x0];
    const d = coarse[y1 * cw + x1];
    if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d)) return null;
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  };

  const sampleAt = (easting, northing) => {
    const sx = (maxX - minX) / width;
    const sy = (maxY - minY) / height; // positive; y grows downward
    const fx = Math.min(width - 1, Math.max(0, (easting - minX) / sx));
    const fy = Math.min(height - 1, Math.max(0, (maxY - northing) / sy));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const h00 = data[y0 * width + x0];
    const h10 = data[y0 * width + x1];
    const h01 = data[y1 * width + x0];
    const h11 = data[y1 * width + x1];
    if (isVoid(h00) || isVoid(h10) || isVoid(h01) || isVoid(h11)) {
      return coarseAt(fx, fy);
    }
    const value =
      h00 * (1 - tx) * (1 - ty) +
      h10 * tx * (1 - ty) +
      h01 * (1 - tx) * ty +
      h11 * tx * ty;
    return Number.isFinite(value) ? value : null;
  };

  return new ElevationSource({ minX, minY, maxX, maxY, sampleAt });
}

/** Parse a mora `.grd` text grid ("E N H" per line, rows south-to-north). */
async function loadGrd(path) {
  const height = [];
  let e0 = null;
  let n0 = null;
  let stepE = null;
  let stepN = null;
  let cols = null;

  for (const line of (await readFile(path, 'utf8')).split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;
    const e = Number(parts[0]);
    const n = Number(parts[1]);
    const h = Number(parts[2]);
    if (!Number.isFinite(e) || !Number.isFinite(n) || !Number.isFinite(h)) continue;

    if (e0 === null) {
      e0 = e;
      n0 = n;
    } else if (n === n0) {
      if (stepE === null) stepE = e - e0;
    } else if (cols === null) {
      cols = height.length;
      stepN = n - n0;
    }
    height.push(h);
  }

  if (!height.length || !stepE || !cols || !stepN) {
    throw new Error(`Could not parse grid: ${path}`);
  }
  const rows = height.length / cols;
  if (!Number.isInteger(rows)) throw new Error(`Non-rectangular grid: ${path}`);
  const data = Float32Array.from(height);

  const minX = e0;
  const maxX = e0 + (cols - 1) * stepE;
  const minY = n0;
  const maxY = n0 + (rows - 1) * stepN;

  const sampleAt = (easting, northing) => {
    const fx = Math.min(cols - 1, Math.max(0, (easting - e0) / stepE));
    const fy = Math.min(rows - 1, Math.max(0, (northing - n0) / stepN));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, cols - 1);
    const y1 = Math.min(y0 + 1, rows - 1);
    const tx = fx - x0;
    const ty = fy - y0;
    return (
      data[y0 * cols + x0] * (1 - tx) * (1 - ty) +
      data[y0 * cols + x1] * tx * (1 - ty) +
      data[y1 * cols + x0] * (1 - tx) * ty +
      data[y1 * cols + x1] * tx * ty
    );
  };

  return new ElevationSource({ minX, minY, maxX, maxY, sampleAt });
}

function encodeTerrainRgb(heightMeters) {
  let value = Math.round((heightMeters + 10000) / 0.1);
  if (value < 0) value = 0;
  if (value > MAX_ENCODED) value = MAX_ENCODED;
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

async function main() {
  const maxZoomArg = process.argv.indexOf('--max-zoom');
  const maxZoom =
    maxZoomArg !== -1 ? Number(process.argv[maxZoomArg + 1]) : TERRAIN_MAX_ZOOM;

  const manifest = await readJson(join(SOURCES_DIR, 'dtm.json'));
  const paths = [];
  for (const dir of Object.values(manifest)) {
    paths.push(...(await findFiles(dir, '.tif')));
    paths.push(...(await findFiles(dir, '.grd')));
  }
  if (!paths.length) throw new Error('No .tif/.grd found; run fetch-dtm first');

  console.log(`Loading ${paths.length} DTM sources…`);
  const sources = [];
  for (const file of paths) {
    const source =
      extname(file).toLowerCase() === '.tif' ? await loadGeoTiff(file) : await loadGrd(file);
    sources.push(source);
    console.log(
      `  ${file
        .split(/[\\/]/)
        .pop()}  E[${Math.round(source.minX)},${Math.round(source.maxX)}] ` +
        `N[${Math.round(source.minY)},${Math.round(source.maxY)}]`,
    );
  }

  const sampleHeight = (easting, northing) => {
    for (const source of sources) {
      const value = source.heightAt(easting, northing);
      if (value !== null) return value;
    }
    return null;
  };

  console.log(`Removing stale tiles at ${TERRAIN_TILES_DIR}`);
  await rm(TERRAIN_TILES_DIR, { recursive: true, force: true });

  let written = 0;
  for (let z = 0; z <= maxZoom; z += 1) {
    const { minX, maxX, minY, maxY } = tileRangeForBounds(TAIWAN_BOUNDS, z);
    let levelWritten = 0;
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const [w, s, e, n] = tileBounds(z, x, y);
        // Reproject four corners, then bilinearly interpolate E/N per pixel.
        const tl = proj4(WGS84, TWD97_TM2, [w, n]);
        const tr = proj4(WGS84, TWD97_TM2, [e, n]);
        const bl = proj4(WGS84, TWD97_TM2, [w, s]);
        const br = proj4(WGS84, TWD97_TM2, [e, s]);

        const png = new PNG({ width: TILE_SIZE, height: TILE_SIZE });
        let hasData = false;

        for (let py = 0; py < TILE_SIZE; py += 1) {
          const fv = py / (TILE_SIZE - 1); // north -> south
          for (let px = 0; px < TILE_SIZE; px += 1) {
            const fu = px / (TILE_SIZE - 1); // west -> east
            const easting =
              (1 - fv) * ((1 - fu) * tl[0] + fu * tr[0]) +
              fv * ((1 - fu) * bl[0] + fu * br[0]);
            const northing =
              (1 - fv) * ((1 - fu) * tl[1] + fu * tr[1]) +
              fv * ((1 - fu) * bl[1] + fu * br[1]);
            const height = sampleHeight(easting, northing);
            const [r, g, b] = encodeTerrainRgb(height ?? 0);
            const offset = (py * TILE_SIZE + px) << 2;
            png.data[offset] = r;
            png.data[offset + 1] = g;
            png.data[offset + 2] = b;
            png.data[offset + 3] = 255;
            if (height !== null) hasData = true;
          }
        }

        if (!hasData) continue;
        const out = join(TERRAIN_TILES_DIR, String(z), String(x), `${y}.png`);
        await ensureDir(dirname(out));
        await writeFile(out, PNG.sync.write(png));
        levelWritten += 1;
      }
    }
    written += levelWritten;
    console.log(`  z${z}: ${levelWritten} tiles`);
  }

  console.log(`\nDone. ${written} terrain tiles written to ${TERRAIN_TILES_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});