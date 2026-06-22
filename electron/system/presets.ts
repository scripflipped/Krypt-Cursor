import { app, dialog, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CustomPreset, Result, Settings } from '../../shared/types';

function file(): string {
  return join(app.getPath('userData'), 'presets.json');
}

async function readAll(): Promise<CustomPreset[]> {
  try {
    const raw = await fs.readFile(file(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomPreset[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: CustomPreset[]): Promise<void> {
  const tmp = file() + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fs.rename(tmp, file());
}

function sanitize(s: unknown): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (s && typeof s === 'object') {
    const src = s as Record<string, unknown>;
    for (const k of ['cursor', 'trail', 'click', 'sound', 'keySound', 'behavior'] as const) {
      if (src[k] && typeof src[k] === 'object') (out as Record<string, unknown>)[k] = src[k];
    }
  }
  return out;
}

export async function listPresets(): Promise<Result<CustomPreset[]>> {
  return { ok: true, message: 'ok', data: await readAll() };
}

export async function savePreset(name: string, settings: Partial<Settings>): Promise<Result<CustomPreset>> {
  try {
    const clean = (name || 'Preset').trim().slice(0, 40) || 'Preset';
    const preset: CustomPreset = { id: randomUUID(), name: clean, settings: sanitize(settings) };
    const list = await readAll();
    list.push(preset);
    await writeAll(list);
    return { ok: true, message: `Saved preset "${clean}".`, data: preset };
  } catch (e) {
    return { ok: false, message: `Save failed: ${(e as Error).message}` };
  }
}

export async function removePreset(id: string): Promise<Result> {
  try {
    const list = await readAll();
    await writeAll(list.filter((p) => p.id !== id));
    return { ok: true, message: 'Preset removed.' };
  } catch (e) {
    return { ok: false, message: `Remove failed: ${(e as Error).message}` };
  }
}

export async function exportPreset(id: string, parent?: BrowserWindow): Promise<Result> {
  try {
    const list = await readAll();
    const preset = list.find((p) => p.id === id);
    if (!preset) return { ok: false, message: 'Preset not found.' };
    const res = await dialog.showSaveDialog(parent ?? new BrowserWindow({ show: false }), {
      title: 'Export preset',
      defaultPath: `${preset.name.replace(/[^a-z0-9-_ ]/gi, '_')}.krypt.json`,
      filters: [{ name: 'Krypt preset', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, message: 'Export cancelled.' };
    await fs.writeFile(res.filePath, JSON.stringify(preset, null, 2), 'utf8');
    return { ok: true, message: `Exported "${preset.name}".` };
  } catch (e) {
    return { ok: false, message: `Export failed: ${(e as Error).message}` };
  }
}

export async function importPreset(parent?: BrowserWindow): Promise<Result<CustomPreset>> {
  try {
    const res = await dialog.showOpenDialog(parent ?? new BrowserWindow({ show: false }), {
      title: 'Import preset',
      properties: ['openFile'],
      filters: [{ name: 'Krypt preset', extensions: ['json'] }],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false, message: 'Import cancelled.' };
    const raw = await fs.readFile(res.filePaths[0], 'utf8');
    const parsed = JSON.parse(raw) as Partial<CustomPreset>;
    const preset: CustomPreset = {
      id: randomUUID(),
      name: (parsed.name || 'Imported').toString().slice(0, 40),
      settings: sanitize(parsed.settings),
    };
    const list = await readAll();
    list.push(preset);
    await writeAll(list);
    return { ok: true, message: `Imported "${preset.name}".`, data: preset };
  } catch (e) {
    return { ok: false, message: `Import failed: ${(e as Error).message}` };
  }
}
