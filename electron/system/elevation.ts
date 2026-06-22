import koffi from 'koffi';
import { app } from 'electron';
import type { Result } from '../../shared/types';

interface Shell32 {
  IsUserAnAdmin: () => boolean;
  ShellExecuteW: (
    hwnd: null,
    op: string,
    file: string,
    params: string | null,
    dir: string | null,
    show: number,
  ) => number;
}

let api: Shell32 | null = null;
let loaded = false;

function load(): Shell32 | null {
  if (loaded) return api;
  loaded = true;
  if (process.platform !== 'win32') return (api = null);
  try {
    const shell32 = koffi.load('shell32.dll');
    api = {
      IsUserAnAdmin: shell32.func('bool IsUserAnAdmin()') as Shell32['IsUserAnAdmin'],
      ShellExecuteW: shell32.func(
        'intptr_t ShellExecuteW(void* hwnd, str16 op, str16 file, str16 params, str16 dir, int show)',
      ) as Shell32['ShellExecuteW'],
    };
    return api;
  } catch {
    return (api = null);
  }
}

export function isElevated(): boolean {
  const w = load();
  if (!w) return false;
  try {
    return !!w.IsUserAnAdmin();
  } catch {
    return false;
  }
}

export function canRelaunchElevated(): boolean {
  return process.platform === 'win32' && app.isPackaged && !!load();
}

export function relaunchAsAdmin(): Result {
  if (isElevated()) return { ok: true, message: 'Already running as administrator.' };
  if (!canRelaunchElevated()) {
    return { ok: false, message: 'Restart as admin is only available in the installed build.' };
  }
  const w = load();
  if (!w) return { ok: false, message: 'Elevation is unavailable on this machine.' };
  try {
    const r = w.ShellExecuteW(null, 'runas', process.execPath, null, null, 1);
    if (r > 32) return { ok: true, message: 'Restarting as administrator…' };
    if (r === 1223 || r === 5) return { ok: false, message: 'Elevation was cancelled.' };
    return { ok: false, message: `Could not relaunch elevated (code ${r}).` };
  } catch (e) {
    return { ok: false, message: `Elevation failed: ${(e as Error).message}` };
  }
}
