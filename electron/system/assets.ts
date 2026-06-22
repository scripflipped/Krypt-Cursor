import { app, dialog, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AssetKind, AssetMeta, Result } from '../../shared/types';

const IMAGE_EXT = ['.png', '.gif', '.webp', '.jpg', '.jpeg', '.svg', '.cur', '.ico'];
const SOUND_EXT = ['.wav', '.mp3', '.ogg', '.m4a', '.flac'];

const MIME: Record<string, string> = {
  '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.cur': 'image/x-icon', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.flac': 'audio/flac',
};

function dir(): string {
  return join(app.getPath('userData'), 'assets');
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(dir(), { recursive: true });
}

function metaFromFilename(filename: string): AssetMeta | null {
  const m = filename.match(/^(cursor|sound)__([0-9a-f-]+)__(.+)$/i);
  if (!m) return null;
  return { kind: m[1] as AssetKind, id: m[2], name: m[3].replace(/\.[^.]+$/, ''), ext: extname(m[3]) };
}

function storedName(meta: AssetMeta): string {
  return `${meta.kind}__${meta.id}__${meta.name}${meta.ext}`;
}

export async function importAsset(kind: AssetKind, parent?: BrowserWindow): Promise<Result<AssetMeta>> {
  try {
    await ensureDir();
    const exts = kind === 'cursor' ? IMAGE_EXT : SOUND_EXT;
    const res = parent
      ? await dialog.showOpenDialog(parent, {
          title: kind === 'cursor' ? 'Choose a cursor image' : 'Choose a click sound',
          properties: ['openFile'],
          filters: [{ name: kind === 'cursor' ? 'Images' : 'Audio', extensions: exts.map((e) => e.slice(1)) }],
        })
      : await dialog.showOpenDialog({ properties: ['openFile'] });
    if (res.canceled || res.filePaths.length === 0) {
      return { ok: false, message: 'Import cancelled.' };
    }
    const src = res.filePaths[0];
    const ext = extname(src).toLowerCase();
    if (!exts.includes(ext)) {
      return { ok: false, message: `Unsupported ${kind} file type: ${ext || 'unknown'}.` };
    }
    const meta: AssetMeta = {
      id: randomUUID(),
      kind,
      name: src.split(/[\\/]/).pop()!.replace(/\.[^.]+$/, '').slice(0, 48),
      ext,
    };
    await fs.copyFile(src, join(dir(), storedName(meta)));
    return { ok: true, message: `Imported ${meta.name}${meta.ext}.`, data: meta };
  } catch (e) {
    return { ok: false, message: `Import failed: ${(e as Error).message}` };
  }
}

export async function listAssets(kind: AssetKind): Promise<Result<AssetMeta[]>> {
  try {
    await ensureDir();
    const files = await fs.readdir(dir());
    const items = files
      .map(metaFromFilename)
      .filter((m): m is AssetMeta => m !== null && m.kind === kind);
    return { ok: true, message: `${items.length} ${kind}(s).`, data: items };
  } catch (e) {
    return { ok: false, message: `Could not list ${kind}s: ${(e as Error).message}`, data: [] };
  }
}

async function findById(id: string): Promise<string | null> {
  await ensureDir();
  const files = await fs.readdir(dir());
  const hit = files.find((f) => metaFromFilename(f)?.id === id);
  return hit ? join(dir(), hit) : null;
}

export async function removeAsset(id: string): Promise<Result> {
  try {
    const path = await findById(id);
    if (!path) return { ok: true, message: 'Already removed.' };
    await fs.unlink(path);
    return { ok: true, message: 'Removed.' };
  } catch (e) {
    return { ok: false, message: `Remove failed: ${(e as Error).message}` };
  }
}

export async function assetDataUrl(id: string): Promise<Result<string>> {
  try {
    const path = await findById(id);
    if (!path) return { ok: false, message: 'Asset not found.' };
    const buf = await fs.readFile(path);
    const mime = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
    return { ok: true, message: 'ok', data: `data:${mime};base64,${buf.toString('base64')}` };
  } catch (e) {
    return { ok: false, message: `Read failed: ${(e as Error).message}` };
  }
}
