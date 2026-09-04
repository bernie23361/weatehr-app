#!/usr/bin/env node
// Generates assets/maps/temp-pill-{deg}@2x.png: a white capsule (horizontal
// pill, matching the home page stat badge) with a thin ring in the matching
// temperature color. Pure Node — writes PNG via built-in zlib (no deps).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'maps');

// Temperature palette — mirrors config/temperature-grid.ts (2026-08-20).
const TEMPERATURE_MIN = -5;
const TEMPERATURE_MAX = 39;
const STOPS = [
  [-5, '#107388'], [-1, '#107388'], [1, '#227E93'], [3, '#3D94A8'], [5, '#63B0C2'],
  [7, '#87CCD9'], [9, '#A5E1EC'], [10, '#B3EBF8'], [11, '#0D894D'], [13, '#2FA257'],
  [15, '#51B265'], [17, '#74C16F'], [19, '#95D07E'], [21, '#BBDF88'], [23, '#D9F191'],
  [25, '#F6E78C'], [27, '#F3C361'], [29, '#EB9D39'], [31, '#E07B07'], [33, '#EA175A'],
  [35, '#75030B'], [36, '#9A68B1'], [37, '#8D4FA4'], [38, '#782B95'], [39, '#782B95'],
];

const hexToRgb = (hex) => {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
};

const mix = (a, b, progress) => [0, 1, 2].map((index) => Math.round(a[index] + (b[index] - a[index]) * progress));

const toHex = (rgb) => '#' + rgb.map((value) => value.toString(16).padStart(2, '0').toUpperCase()).join('');

function temperatureColor(value) {
  if (value > TEMPERATURE_MAX) return STOPS[STOPS.length - 1][1];
  if (value <= TEMPERATURE_MIN) return STOPS[0][1];
  for (let index = 0; index < STOPS.length - 1; index += 1) {
    const [startTemperature, startColor] = STOPS[index];
    const [endTemperature, endColor] = STOPS[index + 1];
    if (value <= endTemperature) {
      const progress = (value - startTemperature) / (endTemperature - startTemperature || 1);
      return toHex(mix(hexToRgb(startColor), hexToRgb(endColor), Math.min(1, Math.max(0, progress))));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

// --- PNG encoding ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buffer) => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};

const pngChunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- pill shape ---
const WIDTH = 92; // @2x of a 46px-wide logical capsule
const HEIGHT = 56; // @2x of 28px
const RING = 4; // ring thickness (px @2x → 2px logical)
const FEATHER = 1.5; // antialiasing feather (px)

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function sdRoundRect(px, py, cx, cy, halfWidth, halfHeight, radius) {
  const qx = Math.abs(px - cx) - (halfWidth - radius);
  const qy = Math.abs(py - cy) - (halfHeight - radius);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
}

function buildPill(ringRgb) {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const outerHalfWidth = WIDTH / 2;
  const outerHalfHeight = HEIGHT / 2;
  const outerRadius = HEIGHT / 2; // full rounded ends → capsule
  const innerHalfWidth = WIDTH / 2 - RING;
  const innerHalfHeight = HEIGHT / 2 - RING;
  const innerRadius = HEIGHT / 2 - RING;

  const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const dOuter = sdRoundRect(x + 0.5, y + 0.5, cx, cy, outerHalfWidth, outerHalfHeight, outerRadius);
      const dInner = sdRoundRect(x + 0.5, y + 0.5, cx, cy, innerHalfWidth, innerHalfHeight, innerRadius);
      const alpha = clamp01(0.5 - dOuter / FEATHER);
      let r = 255;
      let g = 255;
      let b = 255;
      if (alpha > 0) {
        const whiteMix = clamp01(0.5 - dInner / FEATHER); // 1 inside → white fill
        r = Math.round(ringRgb[0] + (255 - ringRgb[0]) * whiteMix);
        g = Math.round(ringRgb[1] + (255 - ringRgb[1]) * whiteMix);
        b = Math.round(ringRgb[2] + (255 - ringRgb[2]) * whiteMix);
      }
      const index = (y * WIDTH + x) * 4;
      pixels[index] = r;
      pixels[index + 1] = g;
      pixels[index + 2] = b;
      pixels[index + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(WIDTH, HEIGHT, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });
for (let degree = 0; degree <= 38; degree += 2) {
  const color = temperatureColor(degree);
  const png = buildPill(hexToRgb(color));
  const file = join(OUT_DIR, `temp-pill-${degree}@2x.png`);
  writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes, ring ${color})`);
}
console.log('done');