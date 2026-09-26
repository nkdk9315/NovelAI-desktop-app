import * as ipc from "@/lib/ipc";
import { alphaToMaskCells, type MaskCells } from "@/lib/mask-grid";
import type { ImageDataDto } from "@/types";

/** An image loaded into the webview: a data URL plus its pixel size. */
export interface LoadedImage {
  src: string;
  width: number;
  height: number;
}

export function toDataUrl(data: ImageDataDto): string {
  return `data:${data.mime};base64,${data.base64}`;
}

/** Strip the `data:...;base64,` prefix. */
export function stripDataUrl(src: string): string {
  const i = src.indexOf(";base64,");
  return i >= 0 ? src.slice(i + 8) : src;
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}

export async function loadImage(src: string): Promise<LoadedImage> {
  const img = await loadImageElement(src);
  return { src, width: img.naturalWidth, height: img.naturalHeight };
}

export async function loadHistoryImage(imageId: string): Promise<LoadedImage> {
  return loadImage(toDataUrl(await ipc.getImageData(imageId)));
}

export async function loadImageFile(path: string): Promise<LoadedImage> {
  return loadImage(toDataUrl(await ipc.readImageFile(path)));
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

export function canvasToBase64Png(canvas: HTMLCanvasElement): string {
  return stripDataUrl(canvas.toDataURL("image/png"));
}

/** Flatten the base image and a (transparent) paint layer into one PNG. */
export async function composeImage(baseSrc: string, paint: HTMLCanvasElement): Promise<string> {
  const base = await loadImageElement(baseSrc);
  const out = createCanvas(base.naturalWidth, base.naturalHeight);
  const ctx = out.getContext("2d")!;
  ctx.drawImage(base, 0, 0);
  ctx.drawImage(paint, 0, 0, out.width, out.height);
  return canvasToBase64Png(out);
}

/** Mask cells of a painted mask layer for the given generation size. */
export function maskCellsOf(mask: HTMLCanvasElement, targetW: number, targetH: number): MaskCells {
  const data = mask.getContext("2d")!.getImageData(0, 0, mask.width, mask.height).data;
  return alphaToMaskCells(data, mask.width, mask.height, targetW, targetH);
}

/** Render mask cells as the black / white PNG the API expects (1/8 size). */
export function maskCellsToBase64(m: MaskCells): string {
  const c = createCanvas(m.cols, m.rows);
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(m.cols, m.rows);
  for (let i = 0; i < m.cells.length; i++) {
    const v = m.cells[i] ? 255 : 0;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvasToBase64Png(c);
}
