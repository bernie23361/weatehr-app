// Web-Mercator slippy-map helpers. Pure arithmetic, no dependencies.

/** Clamp `value` into [min, max]. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Integer tile X for `lon` at zoom `z` (may be out of range; callers clamp). */
export function lonToTileX(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

/** Integer tile Y for `lat` at zoom `z` (Web Mercator; north → smaller y). */
export function latToTileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}

/** West longitude of tile column `x` at zoom `z`. */
export function tileXToLon(x, z) {
  return (x / 2 ** z) * 360 - 180;
}

/** North latitude of tile row `y` at zoom `z`. */
export function tileYToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * Inclusive tile x/y range covering `bounds` = [west, south, east, north] at
 * zoom `z`, clamped to the valid tile grid.
 */
export function tileRangeForBounds(bounds, z) {
  const [west, south, east, north] = bounds;
  const last = 2 ** z - 1;
  return {
    minX: clamp(lonToTileX(west, z), 0, last),
    maxX: clamp(lonToTileX(east, z), 0, last),
    // Latitude is inverted: the north edge is the smaller y.
    minY: clamp(latToTileY(north, z), 0, last),
    maxY: clamp(latToTileY(south, z), 0, last),
  };
}

/** Geographic bounds [west, south, east, north] of one tile. */
export function tileBounds(z, x, y) {
  return [tileXToLon(x, z), tileYToLat(y + 1, z), tileXToLon(x + 1, z), tileYToLat(y, z)];
}
