"use client";

/** Longest side of an attached image after downscaling; enough to read 1080p text. */
const MAX_SIDE = 1600;

/** Image file → JPEG data URL, downscaled so requests stay small. */
export async function imageToDataUrl(file: Blob): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fff"; // transparent screenshots would turn black in JPEG
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}

/** Image files from a paste or drop. */
export function imageFiles(items: DataTransfer | null): File[] {
  if (!items) return [];
  return [...items.files].filter((f) => f.type.startsWith("image/"));
}
