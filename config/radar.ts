export interface RadarBounds {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

// 雷達回波合成圖的地理範圍（8°×8°，以臺灣 121°E / 24°N 為中心）。
// 與 CWA「雷達回波圖」正方形影像的涵蓋範圍一致。
export const RADAR_BOUNDS: RadarBounds = {
  lonMin: 117.0,
  lonMax: 125.0,
  latMin: 20.0,
  latMax: 28.0,
};

// 中央氣象署「雷達回波合併圖」預覽圖：檔名固定、內容持續更新。
// 可透過 EXPO_PUBLIC_RADAR_URL 指定其他來源（如 QPESUMS）取代。
const DEFAULT_RADAR_URL = 'https://www.cwa.gov.tw/Data/radar/CV1_TW_1000_forPreview.png';

export function radarImageUrl(): string {
  return process.env.EXPO_PUBLIC_RADAR_URL ?? DEFAULT_RADAR_URL;
}
