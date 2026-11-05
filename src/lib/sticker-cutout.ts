/** Flood only border-connected pixels; preserve matching colours inside a subject. */
export function removeBorderBackground(pixels: Uint8ClampedArray, width: number, height: number, tolerance = 44): Uint8ClampedArray {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 1_048_576 || pixels.length !== width * height * 4) throw new Error("Unsupported cutout dimensions.");
  const result = new Uint8ClampedArray(pixels), seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
  const corners = [0, width - 1, (height - 1) * width, width * height - 1];
  const colours = corners.map(index => [pixels[index * 4], pixels[index * 4 + 1], pixels[index * 4 + 2]]);
  let head = 0, tail = 0;
  const visit = (index: number) => {
    if (seen[index]) return; seen[index] = 1;
    const p = index * 4;
    if (pixels[p + 3] < 20 || colours.some(colour => Math.max(Math.abs(pixels[p] - colour[0]), Math.abs(pixels[p + 1] - colour[1]), Math.abs(pixels[p + 2] - colour[2])) <= tolerance)) { result[p + 3] = 0; queue[tail++] = index; }
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) { const index = queue[head++], x = index % width; if (x > 0) visit(index - 1); if (x < width - 1) visit(index + 1); if (index >= width) visit(index - width); if (index < width * (height - 1)) visit(index + width); }
  return result;
}

export async function cutoutSticker(source: string): Promise<string> {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(source)) throw new Error("Choose a local sticker image.");
  const image = new Image();
  try {
    image.src = source; await image.decode();
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) throw new Error("Your browser cannot prepare a cutout.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    frame.data.set(removeBorderBackground(frame.data, canvas.width, canvas.height));
    if (!frame.data.some((alpha, index) => index % 4 === 3 && alpha > 0)) throw new Error("The whole image matched its background. Keep the original or choose a clearer background.");
    context.putImageData(frame, 0, 0);
    const output = canvas.toDataURL("image/png"); if (output.length > 7_000_000) throw new Error("This cutout is too large. Use a smaller image.");
    return output;
  } finally { image.src = ""; }
}
