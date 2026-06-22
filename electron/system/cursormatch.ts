import { app, nativeImage } from 'electron';
import { writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

let currentPath: string | null = null;
let currentToken = '';

function file(): string {
  return join(app.getPath('userData'), 'matched-cursor.cur');
}

function buildDib(bgra: Buffer, w: number, h: number): Buffer {
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0);
  bih.writeInt32LE(w, 4);
  bih.writeInt32LE(h * 2, 8);
  bih.writeUInt16LE(1, 12);
  bih.writeUInt16LE(32, 14);
  bih.writeUInt32LE(0, 16);

  const xor = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4;
    const dst = y * w * 4;
    for (let x = 0; x < w; x++) {
      const s = src + x * 4;
      const d = dst + x * 4;
      let b = bgra[s], g = bgra[s + 1], r = bgra[s + 2];
      const a = bgra[s + 3];
      if (a > 0 && a < 255) {
        b = Math.min(255, Math.round((b * 255) / a));
        g = Math.min(255, Math.round((g * 255) / a));
        r = Math.min(255, Math.round((r * 255) / a));
      }
      xor[d] = b; xor[d + 1] = g; xor[d + 2] = r; xor[d + 3] = a;
    }
  }

  const andStride = Math.ceil(w / 32) * 4;
  const and = Buffer.alloc(andStride * h, 0x00);

  return Buffer.concat([bih, xor, and]);
}

function buildCur(dib: Buffer, w: number, h: number, hotX: number, hotY: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(2, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(w >= 256 ? 0 : w, 0);
  entry.writeUInt8(h >= 256 ? 0 : h, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(Math.max(0, Math.min(w - 1, hotX)), 4);
  entry.writeUInt16LE(Math.max(0, Math.min(h - 1, hotY)), 6);
  entry.writeUInt32LE(dib.length, 8);
  entry.writeUInt32LE(6 + 16, 12);

  return Buffer.concat([header, entry, dib]);
}

export function buildMatchedCursor(dataUrl: string, hotspotX: number, hotspotY: number, token: string): string | null {
  if (token && token === currentToken && currentPath) return currentPath;
  try {
    const img = nativeImage.createFromDataURL(dataUrl);
    const { width, height } = img.getSize();
    if (!width || !height) return null;
    const bgra = img.toBitmap();
    if (bgra.length < width * height * 4) return null;

    const hotX = Math.round(Math.max(0, Math.min(1, hotspotX)) * width);
    const hotY = Math.round(Math.max(0, Math.min(1, hotspotY)) * height);
    const cur = buildCur(buildDib(bgra, width, height), width, height, hotX, hotY);

    const path = file();
    const tmp = path + '.tmp';
    writeFileSync(tmp, cur);
    renameSync(tmp, path);

    currentPath = path;
    currentToken = token;
    return path;
  } catch {
    return null;
  }
}

export function matchedCursorPath(): string | null {
  return currentPath;
}

export function clearMatchedCursor(): void {
  currentPath = null;
  currentToken = '';
}
