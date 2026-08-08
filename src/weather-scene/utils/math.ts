export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * clamp(amount);
export const inverseLerp = (from: number, to: number, value: number) => from === to ? 0 : clamp((value - from) / (to - from));
export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = inverseLerp(edge0, edge1, value);
  return t * t * (3 - 2 * t);
};
export const normalizePercentage = (value?: number, fallback = 0) => clamp((value ?? fallback) / 100);

