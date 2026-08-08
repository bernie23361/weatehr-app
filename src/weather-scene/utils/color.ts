import { clamp, lerp } from './math';

interface Hsl { h: number; s: number; l: number }

const hexToHsl = (hex: string): Hsl => {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean;
  const value = Number.parseInt(expanded, 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  return { h, s, l };
};

const hslToHex = ({ h, s, l }: Hsl) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
};

export const mixColor = (from: string, to: string, amount: number) => {
  const a = hexToHsl(from), b = hexToHsl(to);
  const hueDelta = ((b.h - a.h + 540) % 360) - 180;
  return hslToHex({ h: (a.h + hueDelta * clamp(amount) + 360) % 360, s: lerp(a.s, b.s, amount), l: lerp(a.l, b.l, amount) });
};
export const adjustLightness = (color: string, amount: number) => { const hsl = hexToHsl(color); return hslToHex({ ...hsl, l: clamp(hsl.l + amount, 0, 1) }); };
export const adjustSaturation = (color: string, amount: number) => { const hsl = hexToHsl(color); return hslToHex({ ...hsl, s: clamp(hsl.s + amount, 0, 1) }); };
export const isValidHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

