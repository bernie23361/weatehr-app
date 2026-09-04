#!/usr/bin/env node
// Generates data/taiwan-highway-centerlines.ts: one continuous centerline per
// national highway route. Run once at build time (offline) so the app never
// computes heavy geometry on device. Mirrors the roadCenterline logic that was
// previously run synchronously inside weather-observation-screen.tsx (the
// cause of the UI freeze), but produces a static artifact instead.
//
// Usage: node scripts/generate-highway-centerlines.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIGHWAYS_TS = join(__dirname, '..', 'data', 'taiwan-highways.ts');
const OUT_TS = join(__dirname, '..', 'data', 'taiwan-highway-centerlines.ts');

// Elevated / duplicate traces of Freeway 1 that the user asked to hide. The
// source data does not label them, so they are identified by geometry: they are
// the parallel traces of the same corridor (五楊高架 / 汐五高架).
const EXCLUDED_SEGMENTS = {
  'national-0010-hw': [4, 5, 6],
};

const CHAIN_TOLERANCE = 0.006; // degrees (~660m) — connect adjacent pieces only.
const SIMPLIFY_TOLERANCE = 0.0012; // degrees (~130m) — keep shape, drop jitter.
const ROUND_DIGITS = 5; // ~1m precision

const coordinateDistanceSquared = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const dist = (a, b) => Math.sqrt(coordinateDistanceSquared(a, b));

function resampleRoadLine(points, sampleCount) {
  if (points.length < 2 || sampleCount < 2) return points;
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances[index - 1] + Math.sqrt(coordinateDistanceSquared(points[index - 1], points[index])));
  }
  const totalDistance = distances[distances.length - 1];
  if (totalDistance === 0) return Array.from({ length: sampleCount }, () => points[0]);

  let sourceIndex = 1;
  return Array.from({ length: sampleCount }, (_, sampleIndex) => {
    const targetDistance = totalDistance * sampleIndex / (sampleCount - 1);
    while (sourceIndex < distances.length - 1 && distances[sourceIndex] < targetDistance) sourceIndex += 1;
    const startDistance = distances[sourceIndex - 1];
    const endDistance = distances[sourceIndex];
    const progress = (targetDistance - startDistance) / (endDistance - startDistance || 1);
    const start = points[sourceIndex - 1];
    const end = points[sourceIndex];
    return [
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ];
  });
}

// Collapse an out-and-back (both carriageways stored in one segment) into a
// single midpoint line. Non-loop segments are kept as-is.
function segmentCenterline(segment) {
  if (segment.length >= 6) {
    const start = segment[0];
    let turnIndex = 1;
    let maximumDistance = 0;
    for (let index = 1; index < segment.length; index += 1) {
      const distance = coordinateDistanceSquared(start, segment[index]);
      if (distance > maximumDistance) {
        maximumDistance = distance;
        turnIndex = index;
      }
    }
    const closesNearStart = coordinateDistanceSquared(start, segment[segment.length - 1]) < maximumDistance * 0.01;
    if (closesNearStart && turnIndex >= 2 && turnIndex <= segment.length - 3) {
      const outbound = segment.slice(0, turnIndex + 1);
      const inbound = segment.slice(turnIndex).reverse();
      const sampleCount = Math.min(320, Math.max(outbound.length, inbound.length));
      const outboundSamples = resampleRoadLine(outbound, sampleCount);
      const inboundSamples = resampleRoadLine(inbound, sampleCount);
      return outboundSamples.map((point, index) => [
        (point[0] + inboundSamples[index][0]) / 2,
        (point[1] + inboundSamples[index][1]) / 2,
      ]);
    }
  }
  return segment;
}

// Greedy nearest-endpoint chaining of polylines into continuous lines.
function chainPolylines(polylines) {
  const items = polylines.map((points) => points.slice());
  const result = [];
  while (items.length) {
    const current = items.shift();
    let merged = true;
    while (merged) {
      merged = false;
      for (let index = 0; index < items.length; index += 1) {
        const other = items[index];
        const dEndToStart = dist(current[current.length - 1], other[0]);
        const dEndToEnd = dist(current[current.length - 1], other[other.length - 1]);
        const dStartToStart = dist(current[0], other[0]);
        const dStartToEnd = dist(current[0], other[other.length - 1]);
        if (Math.min(dEndToStart, dEndToEnd) <= CHAIN_TOLERANCE) {
          if (dEndToEnd <= dEndToStart) other.reverse();
          current.push(...other);
          items.splice(index, 1);
          merged = true;
          break;
        }
        if (Math.min(dStartToStart, dStartToEnd) <= CHAIN_TOLERANCE) {
          current.reverse();
          if (dStartToEnd <= dStartToStart) other.reverse();
          current.push(...other);
          items.splice(index, 1);
          merged = true;
          break;
        }
      }
    }
    result.push(current);
  }
  return result;
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  let maxDistance = 0;
  let maxIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const [px, py] = points[index];
    let t = lengthSquared === 0 ? 0 : ((px - sx) * dx + (py - sy) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    const distance = Math.hypot(px - (sx + t * dx), py - (sy + t * dy));
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, maxIndex + 1), tolerance);
  const right = simplify(points.slice(maxIndex), tolerance);
  return left.slice(0, -1).concat(right);
}

const roundPoint = ([latitude, longitude]) => [
  Number(latitude.toFixed(ROUND_DIGITS)),
  Number(longitude.toFixed(ROUND_DIGITS)),
];

function loadHighwayRoutes() {
  const source = readFileSync(HIGHWAYS_TS, 'utf8');
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith('export const taiwanHighways'));
  if (!line) throw new Error(`Cannot locate taiwanHighways in ${HIGHWAYS_TS}`);
  let json = line.replace(/^export const taiwanHighways: HighwayRoute\[\] = /, '');
  if (json.endsWith(';')) json = json.slice(0, -1);
  return JSON.parse(json);
}

function main() {
  const routes = loadHighwayRoutes();
  const features = [];
  let totalPoints = 0;

  for (const route of routes) {
    if (route.type !== 'national') continue;
    const excluded = new Set(EXCLUDED_SEGMENTS[route.id] ?? []);
    const pieces = route.segments
      .filter((_, index) => !excluded.has(index))
      .map(segmentCenterline);
    const chains = chainPolylines(pieces);

    for (const chain of chains) {
      if (chain.length < 2) continue;
      const simplified = simplify(chain, SIMPLIFY_TOLERANCE);
      const coordinates = simplified.map((point) => [roundPoint(point)[1], roundPoint(point)[0]]);
      totalPoints += coordinates.length;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: { type: route.type, label: route.label, routeId: route.id },
      });
    }
  }

  const collection = { type: 'FeatureCollection', features };
  const body = `// AUTO-GENERATED by scripts/generate-highway-centerlines.mjs — do not edit by hand.
export const taiwanHighwayCenterlines: GeoJSON.FeatureCollection = ${JSON.stringify(collection)};
`;
  writeFileSync(OUT_TS, body);

  console.log(`Generated ${OUT_TS}`);
  console.log(`features: ${features.length}, total points: ${totalPoints}`);
  for (const route of routes.filter((route) => route.type === 'national')) {
    const excluded = EXCLUDED_SEGMENTS[route.id] ?? [];
    const count = features.filter((feature) => feature.properties.routeId === route.id).length;
    console.log(`  ${route.id}: ${count} feature(s)${excluded.length ? ` (excluded segs ${excluded.join(', ')})` : ''}`);
  }
}

main();