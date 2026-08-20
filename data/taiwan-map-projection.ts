export interface MapPoint {
  x: number;
  y: number;
}

// 等距圓柱投影，與 data/taiwan-islands.ts 的島嶼幾何一致，
// 讓測站經緯度能精確對齊地圖的投影座標。
const LON_ORIGIN = 119.588365;
const LAT_ORIGIN = 25.568857;
const MAP_SCALE = 140;

export function projectCoordinates(latitude: number, longitude: number): MapPoint {
  return {
    x: (longitude - LON_ORIGIN) * MAP_SCALE,
    y: (LAT_ORIGIN - latitude) * MAP_SCALE,
  };
}

export function unprojectCoordinates(point: MapPoint): { latitude: number; longitude: number } {
  return {
    latitude: LAT_ORIGIN - point.y / MAP_SCALE,
    longitude: point.x / MAP_SCALE + LON_ORIGIN,
  };
}
