export interface CountryPngBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CountryPngMeta {
  id: 'china' | 'north-korea' | 'south-korea' | 'japan' | 'philippines';
  name: string;
  bounds: CountryPngBounds;
}

// Rasterised from data/regional-country-outlines.ts (Natural Earth 1:50m
// Admin 0 Countries v5.1.1, same equirectangular projection as the Taiwan
// islands). The bounds are viewBox units; render each PNG with
// preserveAspectRatio="none" at exactly these bounds so it aligns with the
// projected geography and the Taiwan SVG islands.
export const countryPngs: CountryPngMeta[] = [
  {
    "id": "china",
    "name": "中國",
    "bounds": {
      "x": -6439,
      "y": -3920,
      "width": 8563,
      "height": 4951
    }
  },
  {
    "id": "north-korea",
    "name": "北韓",
    "bounds": {
      "x": 665,
      "y": -2442,
      "width": 890,
      "height": 742
    }
  },
  {
    "id": "south-korea",
    "name": "韓國",
    "bounds": {
      "x": 897,
      "y": -1829,
      "width": 693,
      "height": 762
    }
  },
  {
    "id": "japan",
    "name": "日本",
    "bounds": {
      "x": 571,
      "y": -2793,
      "width": 3105,
      "height": 2977
    }
  },
  {
    "id": "philippines",
    "name": "菲律賓",
    "bounds": {
      "x": -368,
      "y": 660,
      "width": 1350,
      "height": 2213
    }
  }
];
