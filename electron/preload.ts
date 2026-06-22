import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppMeta,
  AssetKind,
  AssetMeta,
  ClickPulse,
  CustomPreset,
  KeyPulse,
  KryptBridge,
  PointerEvent,
  Result,
  Settings,
} from '../shared/types';

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const handler = (_e: unknown, payload: T): void => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const bridge: KryptBridge = {
  app: {
    meta: () => ipcRenderer.invoke('app:meta') as Promise<AppMeta>,
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url) as Promise<Result>,
    quit: () => ipcRenderer.invoke('app:quit') as Promise<Result>,
    onNotice: (cb) => on('app:notice', cb),
    takeNotices: () =>
      ipcRenderer.invoke('app:takeNotices') as Promise<{ level: 'info' | 'warn' | 'error'; message: string }[]>,
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get') as Promise<Settings>,
    update: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:update', patch) as Promise<Result<Settings>>,
    reset: () => ipcRenderer.invoke('settings:reset') as Promise<Result<Settings>>,
    onChanged: (cb: (s: Settings) => void) => on<Settings>('settings:changed', cb),
  },
  assets: {
    import: (kind: AssetKind) => ipcRenderer.invoke('assets:import', kind) as Promise<Result<AssetMeta>>,
    list: (kind: AssetKind) => ipcRenderer.invoke('assets:list', kind) as Promise<Result<AssetMeta[]>>,
    remove: (id: string) => ipcRenderer.invoke('assets:remove', id) as Promise<Result>,
    dataUrl: (id: string) => ipcRenderer.invoke('assets:dataUrl', id) as Promise<Result<string>>,
  },
  presets: {
    list: () => ipcRenderer.invoke('presets:list') as Promise<Result<CustomPreset[]>>,
    save: (name: string, settings: Partial<Settings>) => ipcRenderer.invoke('presets:save', name, settings) as Promise<Result<CustomPreset>>,
    remove: (id: string) => ipcRenderer.invoke('presets:remove', id) as Promise<Result>,
    export: (id: string) => ipcRenderer.invoke('presets:export', id) as Promise<Result>,
    import: () => ipcRenderer.invoke('presets:import') as Promise<Result<CustomPreset>>,
  },
  overlay: {
    setVisible: (visible: boolean) => ipcRenderer.invoke('overlay:setVisible', visible) as Promise<Result>,
    onPointer: (cb: (p: PointerEvent) => void) => on<PointerEvent>('overlay:pointer', cb),
    onClick: (cb: (c: ClickPulse) => void) => on<ClickPulse>('overlay:click', cb),
    onKey: (cb: (k: KeyPulse) => void) => on<KeyPulse>('overlay:key', cb),
    onActive: (cb: (active: boolean) => void) => on<boolean>('overlay:active', cb),
  },
  system: {
    elevation: () =>
      ipcRenderer.invoke('system:elevation') as Promise<{ elevated: boolean; supported: boolean }>,
    relaunchAsAdmin: () => ipcRenderer.invoke('system:relaunchAsAdmin') as Promise<Result>,
    reportCursorBitmap: (dataUrl: string) =>
      ipcRenderer.invoke('system:reportCursorBitmap', dataUrl) as Promise<Result>,
  },
};

contextBridge.exposeInMainWorld('krypt', bridge);
