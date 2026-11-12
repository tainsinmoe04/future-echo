import type { PageTransform } from "./domain";

export const DEFAULT_TRANSFORM: PageTransform = { x: 0, y: 0, scale: 1, rotation: 0 };
// Serialization guard only. The actual editing limit is the available page area.
export const MAX_TRANSFORM_SCALE = 100;
export interface Point { x: number; y: number }
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const finite = (n: number, fallback: number) => Number.isFinite(n) ? n : fallback;
export const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
export const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
export const turn = (n: number) => ((n + 180) % 360 + 360) % 360 - 180;
export function boundTransform(value: PageTransform, center: Point, objectWidth: number, objectHeight: number, width: number, height: number): PageTransform {
  const next = normalizeTransform(value);
  if (width <= 0 || height <= 0) return next;
  const radians = next.rotation * Math.PI / 180;
  const w = Math.abs(Math.cos(radians)) * objectWidth + Math.abs(Math.sin(radians)) * objectHeight;
  const h = Math.abs(Math.sin(radians)) * objectWidth + Math.abs(Math.cos(radians)) * objectHeight;
  const scale = Math.max(0.5, Math.min(next.scale, (width - 24) / Math.max(1, w), (height - 24) / Math.max(1, h)));
  const halfW = Math.min(width / 2, w * scale / 2 + 12), halfH = Math.min(height / 2, h * scale / 2 + 12);
  return { ...next, scale, x: (clamp(center.x + next.x / 100 * width, halfW, width - halfW) - center.x) / width * 100,
    y: (clamp(center.y + next.y / 100 * height, halfH, height - halfH) - center.y) / height * 100 };
}
export function normalizeTransform(v: PageTransform): PageTransform {
  return { x: clamp(finite(v.x, 0), -100, 100), y: clamp(finite(v.y, 0), -100, 100),
    scale: clamp(finite(v.scale, 1), 0.5, MAX_TRANSFORM_SCALE), rotation: turn(finite(v.rotation, 0)) };
}

export function gestureTransform(start: PageTransform, before: readonly Point[], after: readonly Point[], width: number, height: number): PageTransform {
  if (!before.length || before.length !== after.length || width <= 0 || height <= 0) return start;
  const center = (points: readonly Point[]) => ({ x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length });
  const a = center(before), b = center(after);
  const length = before.length === 2 ? distance(before[0], before[1]) : 0;
  return normalizeTransform({ ...start, x: start.x + (b.x - a.x) / width * 100, y: start.y + (b.y - a.y) / height * 100,
    scale: length > 5 ? start.scale * distance(after[0], after[1]) / length : start.scale,
    rotation: length > 5 ? start.rotation + turn(angle(after[0], after[1]) - angle(before[0], before[1])) : start.rotation });
}
