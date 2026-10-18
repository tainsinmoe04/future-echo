import type { JourneyMoment, PhotoCrop } from "./domain";
import { momentDay } from "./local-date";
export const HORIZON_CHOICES = ["I arrived somewhere meaningful", "I want to keep going", "I want to reach further", "I want something different"] as const;
export function findMoments(items: readonly JourneyMoment[], query: string, year = "", month = "") {
  const terms = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((m) => !m.deletedAt && (!year || momentDay(m).startsWith(year)) && (!month || momentDay(m).startsWith(month)) && terms.every((term) => [m.title, m.originalExcerpt, m.myNote, m.reflection, ...(m.photos ?? []).map((p) => p.caption)].filter(Boolean).join(" ").normalize("NFKC").toLocaleLowerCase().includes(term)));
}
export const DEFAULT_CROP: PhotoCrop = { x: 50, y: 50, zoom: 1, aspect: "portrait" };
export function normalizeCrop(value: PhotoCrop): PhotoCrop {
  const bound = (n: number, min: number, max: number, fallback: number) => Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  return { x: bound(value.x, 0, 100, 50), y: bound(value.y, 0, 100, 50), zoom: bound(value.zoom, 1, 3, 1), aspect: ["square", "portrait", "landscape", "original"].includes(value.aspect) ? value.aspect : "portrait" };
}
export const cropRatio = (crop?: PhotoCrop) => crop?.aspect === "square" ? "1" : crop?.aspect === "landscape" ? "1.5" : crop?.aspect === "original" ? "auto" : ".85";
export function pageObjectIds(moment: JourneyMoment) { return ["words", ...(moment.relatedAiReply ? ["reply"] : []), ...(moment.myNote ? ["note"] : []), ...(moment.photos ?? []).map((p) => `photo:${p.id}`), ...(moment.stickerPlacements ?? []).map((p) => `sticker:${p.id}`)]; }
export function moveLayer(layers: readonly string[], ids: readonly string[], selected: string, direction: "front" | "back") {
  const order = [...new Set([...layers.filter((id) => ids.includes(id)), ...ids])].filter((id) => id !== selected);
  if (!ids.includes(selected)) return order;
  return direction === "front" ? [...order, selected] : [selected, ...order];
}
