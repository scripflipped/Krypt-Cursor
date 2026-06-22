import { ipcMain, shell, BrowserWindow } from 'electron';
import type { AssetKind, Result, Settings } from '../shared/types';
import { resolveAppMeta } from './system/runtime';
import { loadSettings, patchSettings, resetSettings } from './system/store';
import { importAsset, listAssets, removeAsset, assetDataUrl } from './system/assets';
import { listPresets, savePreset, removePreset, exportPreset, importPreset } from './system/presets';
import { isElevated, canRelaunchElevated, relaunchAsAdmin } from './system/elevation';

export interface IpcDeps {
  mainWindow: () => BrowserWindow | null;
  overlayWindow: () => BrowserWindow | null;
  parentWindow: () => BrowserWindow | null;
  applySettings: (s: Settings) => void;
  broadcast: (channel: string, payload: unknown) => void;
  onCursorBitmap: (dataUrl: string) => void;
  takeNotices: () => { level: 'info' | 'warn' | 'error'; message: string }[];
  quit: () => void;
}

export function registerIpc(deps: IpcDeps): void {
  ipcMain.handle('app:meta', () => resolveAppMeta());

  ipcMain.handle('app:openExternal', async (_e, url: string): Promise<Result> => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return { ok: false, message: 'Blocked a non-web link.' };
    }
    try {
      await shell.openExternal(url);
      return { ok: true, message: 'Opened in browser.' };
    } catch (e) {
      return { ok: false, message: `Could not open link: ${(e as Error).message}` };
    }
  });

  ipcMain.handle('app:quit', (): Result => {
    deps.quit();
    return { ok: true, message: 'Quitting.' };
  });

  ipcMain.handle('app:takeNotices', () => deps.takeNotices());

  ipcMain.handle('settings:get', () => loadSettings());

  ipcMain.handle('settings:update', async (_e, patch: Partial<Settings>): Promise<Result<Settings>> => {
    try {
      const next = await patchSettings(patch);
      deps.applySettings(next);
      return { ok: true, message: 'Saved.', data: next };
    } catch (e) {
      return { ok: false, message: `Could not save: ${(e as Error).message}` };
    }
  });

  ipcMain.handle('settings:reset', async (): Promise<Result<Settings>> => {
    try {
      const next = await resetSettings();
      deps.applySettings(next);
      return { ok: true, message: 'Restored defaults.', data: next };
    } catch (e) {
      return { ok: false, message: `Reset failed: ${(e as Error).message}` };
    }
  });

  ipcMain.handle('assets:import', (_e, kind: AssetKind) =>
    importAsset(kind, deps.parentWindow() ?? undefined),
  );
  ipcMain.handle('assets:list', (_e, kind: AssetKind) => listAssets(kind));
  ipcMain.handle('assets:remove', (_e, id: string) => removeAsset(id));
  ipcMain.handle('assets:dataUrl', (_e, id: string) => assetDataUrl(id));

  ipcMain.handle('presets:list', () => listPresets());
  ipcMain.handle('presets:save', (_e, name: string, settings: Partial<Settings>) => savePreset(name, settings));
  ipcMain.handle('presets:remove', (_e, id: string) => removePreset(id));
  ipcMain.handle('presets:export', (_e, id: string) => exportPreset(id, deps.parentWindow() ?? undefined));
  ipcMain.handle('presets:import', () => importPreset(deps.parentWindow() ?? undefined));

  ipcMain.handle('system:elevation', (): { elevated: boolean; supported: boolean } => ({
    elevated: isElevated(),
    supported: canRelaunchElevated(),
  }));

  ipcMain.handle('system:relaunchAsAdmin', (): Result => {
    if (isElevated()) return { ok: true, message: 'Already running as administrator.' };
    const res = relaunchAsAdmin();
    if (res.ok) {
      setTimeout(() => deps.quit(), 200);
    }
    return res;
  });

  ipcMain.handle('system:reportCursorBitmap', (_e, dataUrl: string): Result => {
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
      deps.onCursorBitmap(dataUrl);
      return { ok: true, message: 'ok' };
    }
    return { ok: false, message: 'Invalid cursor snapshot.' };
  });

  ipcMain.handle('overlay:setVisible', async (_e, visible: boolean): Promise<Result> => {
    try {
      const next = await patchSettings({ enabled: !!visible });
      deps.applySettings(next);
      return { ok: true, message: visible ? 'Overlay on.' : 'Overlay off.' };
    } catch (e) {
      return { ok: false, message: `Toggle failed: ${(e as Error).message}` };
    }
  });
}
