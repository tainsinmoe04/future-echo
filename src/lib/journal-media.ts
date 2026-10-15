import { collectJournalImages, isJournalImageSource, type JournalSnapshot } from "./journal-snapshot";

const MAX_SIDE = 8192;
const MAX_PIXELS = 32_000_000;
/** Inspect encoded dimensions before asking the browser to allocate decoded pixels. */
export function rasterDimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number, size: number) => String.fromCharCode(...bytes.slice(start, start + size));
  let width = 0, height = 0;
  if (bytes.length >= 24 && ascii(1, 3) === "PNG" && ascii(12, 4) === "IHDR") {
    width = view.getUint32(16); height = view.getUint32(20);
    let offset = 8;
    while (offset + 12 <= bytes.length) { const length = view.getUint32(offset); if (offset + 12 + length > bytes.length) throw new Error("This PNG is truncated."); if (ascii(offset + 4, 4) === "acTL") throw new Error("Choose a still image, rather than an animated PNG."); offset += length + 12; }
  } else if (bytes.length >= 20 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const kind = ascii(offset, 4), length = view.getUint32(offset + 4, true), p = offset + 8;
      if (p + length > bytes.length) break;
      if (kind === "ANIM" || kind === "ANMF" || (kind === "VP8X" && (bytes[p] & 2))) throw new Error("Choose a still image, rather than an animated WebP.");
      if (kind === "VP8X" && length >= 10) { width = 1 + bytes[p + 4] + bytes[p + 5] * 256 + bytes[p + 6] * 65536; height = 1 + bytes[p + 7] + bytes[p + 8] * 256 + bytes[p + 9] * 65536; }
      if (kind === "VP8 " && length >= 10 && !width) { width = view.getUint16(p + 6, true) & 0x3fff; height = view.getUint16(p + 8, true) & 0x3fff; }
      if (kind === "VP8L" && length >= 5 && !width) { const bits = view.getUint32(p + 1, true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; }
      offset = p + length + (length % 2);
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 3 < bytes.length) {
      if (bytes[p++] !== 255) break;
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (p + 2 > bytes.length) break;
      const size = view.getUint16(p);
      if (size < 2 || p + size > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && size >= 8) { height = view.getUint16(p + 3); width = view.getUint16(p + 5); break; }
      p += size;
    }
  }
  if (!width || !height) throw new Error("This image has an unsupported or damaged header.");
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) throw new Error("Choose an image up to 8192 pixels per side and 32 megapixels.");
  return { width, height };
}

export async function decodeJournalImage(source: string): Promise<void> {
  if (!isJournalImageSource(source)) throw new Error("This image is not a supported local JPG, PNG or WebP.");
  if (!source.startsWith("data:")) return; // Fixed bundled fixtures, not imported remote resources.
  const binary = atob(source.split(",")[1]);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  rasterDimensions(bytes);
  const image = new Image();
  const wait = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { image.src = ""; reject(new Error("The image took too long to open.")); }, 10000);
    image.onload = () => { clearTimeout(timer); if (!image.naturalWidth || image.naturalWidth > MAX_SIDE || image.naturalHeight > MAX_SIDE || image.naturalWidth * image.naturalHeight > MAX_PIXELS) reject(new Error("The decoded image is too large.")); else resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error("This image could not be opened. Choose another file.")); };
  });
  image.src = source;
  try { await wait; } finally { image.onload = null; image.onerror = null; image.src = ""; }
}

export async function readRasterFile(file: File): Promise<string> {
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WebP smaller than 5 MiB.");
  const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("The image could not be read.")); reader.readAsDataURL(file); });
  await decodeJournalImage(source);
  return source;
}

export async function validateJournalMedia(snapshot: JournalSnapshot): Promise<void> {
  // Sequential decoding bounds peak work; never render imported images before this completes.
  for (const source of new Set(collectJournalImages(snapshot))) await decodeJournalImage(source);
}
