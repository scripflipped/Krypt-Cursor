import { app } from 'electron';
import { promises as fs, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { ColorConfig, Settings } from '../../shared/types';
import { WATERMARK } from './runtime';

const krypt = (): ColorConfig => ({ mode: 'gradient', a: '#6366F1', b: '#EC4899' });

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  hideSystemCursor: false,
  systemCursorMatch: false,
  startWithWindows: false,
  onboarded: false,
  kryptUsername: '',
  cursor: {
    imageId: null,
    shape: 'glow',
    size: 28,
    rotation: 0,
    opacity: 1,
    hotspotX: 0.5,
    hotspotY: 0.5,
    color: { mode: 'solid', a: '#A855F7', b: '#EC4899' },
    glow: 0.7,
    smoothing: 0.35,
    spin: 0,
    pulse: 0,
    clickScale: 0.3,
    ghost: { enabled: false, count: 3, opacity: 0.5, delay: 0.5 },
    outline: { enabled: false, color: '#000000', width: 3 },
  },
  trail: {
    enabled: true,
    style: 'comet',
    color: krypt(),
    length: 18,
    thickness: 6,
    fade: 0.12,
    glow: 0.4,
    spacing: 2,
  },
  click: {
    enabled: true,
    effect: 'ring',
    color: krypt(),
    size: 36,
    count: 14,
    spread: 0.5,
    gravity: 0.2,
    lifetime: 1,
    glow: 0.5,
    emoji: '🎉✨💜',
    text: 'nice',
    buttons: { left: true, right: true, middle: true },
  },
  sound: { enabled: false, soundId: null, volume: 0.5, pitchJitter: 0 },
  keySound: { enabled: false, soundId: null, volume: 0.4, pitchJitter: 0.15 },
  behavior: { rainbowSpeed: 120, hideOnIdle: false, idleSeconds: 4 },
  hotkeys: { toggle: 'CommandOrControl+Alt+C' },
  schema: WATERMARK,
};

function file(): string {
  return join(app.getPath('userData'), 'settings.json');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, src: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(src)) return base;
  const out = base as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    const bv = out[key];
    const sv = src[key];
    if (sv === undefined || sv === null) continue;
    if (isPlainObject(bv) && isPlainObject(sv)) {
      out[key] = deepMerge(bv, sv);
    } else if (bv === null) {
      out[key] = sv;
    } else if (typeof bv === typeof sv && Array.isArray(bv) === Array.isArray(sv)) {
      out[key] = sv;
    }
  }
  return base;
}

export function mergeState(loaded: unknown): Settings {
  const merged = deepMerge(structuredClone(DEFAULT_SETTINGS), loaded);
  merged.schema = WATERMARK;
  return merged;
}

let cache: Settings | null = null;

export async function loadSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(file(), 'utf8');
    cache = mergeState(JSON.parse(raw));
  } catch {
    cache = structuredClone(DEFAULT_SETTINGS);
  }
  return cache;
}

const WRITE_DEBOUNCE = 250;
const WRITE_MAX_WAIT = 1000;

let dirty: Settings | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let firstDirtyAt = 0;

function writeNow(next: Settings): void {
  const tmp = file() + '.tmp';
  writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  renameSync(tmp, file());
}

function scheduleWrite(next: Settings): void {
  dirty = next;
  const nowMs = Date.now();
  if (!writeTimer) firstDirtyAt = nowMs;
  else clearTimeout(writeTimer);
  const wait = Math.min(WRITE_DEBOUNCE, Math.max(0, firstDirtyAt + WRITE_MAX_WAIT - nowMs));
  writeTimer = setTimeout(() => {
    writeTimer = null;
    const pending = dirty;
    dirty = null;
    if (pending) {
      try { writeNow(pending); } catch {  }
    }
  }, wait);
}

export function flushSettings(): void {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  if (dirty) {
    try { writeNow(dirty); } catch {  }
    dirty = null;
  }
}

export async function saveSettings(next: Settings): Promise<void> {
  cache = next;
  scheduleWrite(next);
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const merged = mergeState({ ...current, ...patch });
  await saveSettings(merged);
  return merged;
}

export async function resetSettings(): Promise<Settings> {
  const current = await loadSettings();
  const fresh = structuredClone(DEFAULT_SETTINGS);
  fresh.onboarded = current.onboarded;
  await saveSettings(fresh);
  return fresh;
}
