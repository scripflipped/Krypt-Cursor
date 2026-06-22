import { app, BrowserWindow, Tray, Menu, screen, nativeImage, globalShortcut } from 'electron';
import { join } from 'node:path';
import type { Settings } from '../shared/types';
import { registerIpc } from './ipc';
import { loadSettings, flushSettings } from './system/store';
import { startInput, stopInput } from './system/input';
import { hideSystemCursor, restoreSystemCursor, forceRestoreSystemCursor, matchSystemCursor, initSystemCursor } from './system/cursor';
import { buildMatchedCursor, matchedCursorPath, clearMatchedCursor } from './system/cursormatch';
import { needsSystemCursor } from './system/desktop';
import { hydrateClientContext, syncRuntimeState, releaseClientContext, setPresenceProfile } from './system/session';
import { resolveAppMeta } from './system/runtime';

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const ROOT = join(__dirname, '..');

interface OverlayView {
  win: BrowserWindow;
  displayId: number;
  origin: { x: number; y: number };
}

let mainWindow: BrowserWindow | null = null;
let overlays: OverlayView[] = [];
let tray: Tray | null = null;
let lastPointer = { x: 0, y: 0 };
let keepOnTopTimer: ReturnType<typeof setInterval> | null = null;

let suppressed = false;
let blockWatchTimer: ReturnType<typeof setInterval> | null = null;

function assetPath(file: string): string {
  return join(app.getAppPath(), 'resources', file);
}

function appIcon(): Electron.NativeImage {
  const img = nativeImage.createFromPath(assetPath('krypt.png'));
  return img.isEmpty() ? nativeImage.createEmpty() : img;
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 880,
    minHeight: 600,
    show: false,
    backgroundColor: '#0A0A0F',
    title: resolveAppMeta().name,
    icon: appIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.removeMenu();
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => (mainWindow = null));

  if (DEV_URL) mainWindow.loadURL(DEV_URL);
  else mainWindow.loadFile(join(ROOT, 'dist', 'index.html'));
}

function createOverlayForDisplay(display: Electron.Display): OverlayView {
  const b = display.bounds;
  const win = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    frame: false,
    transparent: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    backgroundColor: '#00000000',
    type: 'toolbar',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const view: OverlayView = { win, displayId: display.id, origin: { x: b.x, y: b.y } };
  applyOverlayFlags(win);
  win.on('closed', () => {
    overlays = overlays.filter((o) => o.win !== win);
  });
  win.webContents.once('did-finish-load', () => {
    if (current?.enabled) showOverlayWindow(view);
  });

  if (DEV_URL) win.loadURL(`${DEV_URL}/overlay.html`);
  else win.loadFile(join(ROOT, 'dist', 'overlay.html'));
  return view;
}

function createOverlays(): void {
  overlays = screen.getAllDisplays().map(createOverlayForDisplay);
}

function applyOverlayFlags(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: false });
}

function reflowOverlays(): void {
  const displays = screen.getAllDisplays();
  const live = new Set<number>();
  for (const d of displays) {
    live.add(d.id);
    const existing = overlays.find((o) => o.displayId === d.id && !o.win.isDestroyed());
    if (existing) {
      existing.origin = { x: d.bounds.x, y: d.bounds.y };
      existing.win.setBounds(d.bounds);
      applyOverlayFlags(existing.win);
    } else {
      overlays.push(createOverlayForDisplay(d));
    }
  }
  for (const o of overlays) {
    if (!live.has(o.displayId) && !o.win.isDestroyed()) o.win.destroy();
  }
  overlays = overlays.filter((o) => live.has(o.displayId) && !o.win.isDestroyed());
}

function showOverlayWindow(view: OverlayView): void {
  if (view.win.isDestroyed()) return;
  view.win.showInactive();
  applyOverlayFlags(view.win);
}

function showOverlay(on: boolean): void {
  for (const o of overlays) {
    if (o.win.isDestroyed()) continue;
    if (on) showOverlayWindow(o);
    else o.win.hide();
  }
  if (on) startKeepOnTop();
  else stopKeepOnTop();
}

function overlayAt(x: number, y: number): OverlayView | null {
  const d = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) });
  return overlays.find((o) => o.displayId === d.id && !o.win.isDestroyed())
    ?? overlays.find((o) => !o.win.isDestroyed())
    ?? null;
}

const RAISE_THROTTLE_MS = 50;
let lastRaise = 0;

function pointInRect(p: { x: number; y: number }, r: Electron.Rectangle): boolean {
  return p.x >= r.x && p.y >= r.y && p.x < r.x + r.width && p.y < r.y + r.height;
}

function inReservedStrip(p: { x: number; y: number }): boolean {
  const d = screen.getDisplayNearestPoint({ x: Math.round(p.x), y: Math.round(p.y) });
  return pointInRect(p, d.bounds) && !pointInRect(p, d.workArea);
}

function raiseForPoint(p: { x: number; y: number }, force = false): void {
  const o = overlayAt(p.x, p.y);
  if (!o || o.win.isDestroyed() || !o.win.isVisible()) return;
  const now = Date.now();
  if (force || inReservedStrip(p) || now - lastRaise >= RAISE_THROTTLE_MS) {
    o.win.moveTop();
    lastRaise = now;
  }
}

function startKeepOnTop(): void {
  if (keepOnTopTimer) return;
  keepOnTopTimer = setInterval(() => {
    for (const o of overlays) {
      if (!o.win.isDestroyed() && o.win.isVisible()) o.win.moveTop();
    }
  }, 250);
}

function stopKeepOnTop(): void {
  if (keepOnTopTimer) {
    clearInterval(keepOnTopTimer);
    keepOnTopTimer = null;
  }
}

const WATCH_MS = 80;

type CursorMode = 'default' | 'hidden' | 'matched';
let appliedMode: CursorMode = 'default';
let appliedMatchToken = '';
let matchToken = '';

function desiredCursorMode(): CursorMode {
  if (!current?.enabled) return 'default';
  if (suppressed) {
    return current.systemCursorMatch && matchedCursorPath() ? 'matched' : 'default';
  }
  return current.hideSystemCursor ? 'hidden' : 'default';
}

function applySystemCursor(): void {
  const mode = desiredCursorMode();
  const stale = mode === 'matched' && appliedMatchToken !== matchToken;
  if (mode === appliedMode && !stale) return;
  if (mode === 'hidden') {
    hideSystemCursor();
  } else if (mode === 'matched') {
    const path = matchedCursorPath();
    if (path) {
      matchSystemCursor(path);
      appliedMatchToken = matchToken;
    }
  } else {
    restoreSystemCursor();
  }
  appliedMode = mode;
}

function onCursorBitmap(dataUrl: string): void {
  if (dataUrl === matchToken) return;
  const path = buildMatchedCursor(dataUrl, 0.5, 0.5, dataUrl);
  if (!path) return;
  matchToken = dataUrl;
  applySystemCursor();
}

function enterSuppressed(): void {
  if (suppressed) return;
  suppressed = true;
  broadcast('overlay:active', false);
  applySystemCursor();
}

function exitSuppressed(): void {
  if (!suppressed) return;
  suppressed = false;
  broadcast('overlay:active', true);
  applySystemCursor();
}

function startBlockWatch(): void {
  if (blockWatchTimer) return;
  blockWatchTimer = setInterval(() => {
    const defer = needsSystemCursor();
    if (defer && !suppressed) enterSuppressed();
    else if (!defer && suppressed) exitSuppressed();
  }, WATCH_MS);
}

function stopBlockWatch(): void {
  if (blockWatchTimer) {
    clearInterval(blockWatchTimer);
    blockWatchTimer = null;
  }
  if (suppressed) exitSuppressed();
}

function updateBlockWatch(): void {
  if (current?.enabled) startBlockWatch();
  else stopBlockWatch();
}

let current: Settings | null = null;

function applyHotkey(accel: string): void {
  globalShortcut.unregisterAll();
  if (!accel) return;
  try {
    globalShortcut.register(accel, () => {
      if (current) applySettings({ ...current, enabled: !current.enabled });
    });
  } catch {
  }
}

function applyLoginItem(open: boolean): void {
  try {
    app.setLoginItemSettings({ openAtLogin: open });
  } catch {
  }
}

function applySettings(next: Settings): void {
  const prev = current;
  current = next;
  if (next.enabled && !prev?.enabled) suppressed = false;
  if (prev?.systemCursorMatch && !next.systemCursorMatch) {
    clearMatchedCursor();
    matchToken = '';
    appliedMatchToken = '';
  }
  showOverlay(next.enabled);
  applySystemCursor();
  if (!prev || prev.hotkeys.toggle !== next.hotkeys.toggle) applyHotkey(next.hotkeys.toggle);
  if (!prev || prev.startWithWindows !== next.startWithWindows) applyLoginItem(next.startWithWindows);
  updateBlockWatch();
  broadcast('overlay:active', !suppressed);
  setPresenceProfile(next.kryptUsername);
  syncRuntimeState(next.enabled ? 'Cursor active' : 'Paused');
  broadcast('settings:changed', next);
}

function broadcast(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

type Notice = { level: 'info' | 'warn' | 'error'; message: string };
const bootNotices: Notice[] = [];
let uiReady = false;

function notify(level: Notice['level'], message: string): void {
  if (uiReady) broadcast('app:notice', { level, message });
  else bootNotices.push({ level, message });
}

function takeNotices(): Notice[] {
  uiReady = true;
  const out = bootNotices.slice();
  bootNotices.length = 0;
  return out;
}

function createTray(): void {
  try {
    const icon = appIcon().resize({ width: 16, height: 16 });
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip(resolveAppMeta().name);
    const menu = Menu.buildFromTemplate([
      { label: 'Settings', click: () => revealMain() },
      {
        label: 'Effects enabled',
        type: 'checkbox',
        checked: current?.enabled ?? true,
        click: (item) => {
          if (current) applySettings({ ...current, enabled: item.checked });
        },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
    tray.on('click', () => revealMain());
  } catch {
  }
}

function revealMain(): void {
  if (!mainWindow) createMainWindow();
  else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => revealMain());

  app.whenReady().then(async () => {
    initSystemCursor();
    forceRestoreSystemCursor();

    current = await loadSettings();

    createMainWindow();
    createOverlays();
    createTray();

    registerIpc({
      mainWindow: () => mainWindow,
      overlayWindow: () => overlays[0]?.win ?? null,
      parentWindow: () => mainWindow,
      applySettings,
      broadcast,
      onCursorBitmap,
      takeNotices,
      quit: () => app.quit(),
    });

    const inputRes = startInput({
      onPointer: (p) => {
        lastPointer = { x: p.x, y: p.y };
        for (const o of overlays) {
          if (o.win.isDestroyed()) continue;
          o.win.webContents.send('overlay:pointer', { x: p.x - o.origin.x, y: p.y - o.origin.y });
        }
        raiseForPoint(p);
      },
      onClick: (c) => {
        const o = overlayAt(c.x, c.y);
        o?.win.webContents.send('overlay:click', {
          x: c.x - o.origin.x,
          y: c.y - o.origin.y,
          button: c.button,
        });
        raiseForPoint(c, true);
      },
      onKey: (keycode) => {
        overlayAt(lastPointer.x, lastPointer.y)?.win.webContents.send('overlay:key', { keycode });
      },
    });
    if (!inputRes.ok || inputRes.message.includes('unavailable')) {
      notify('warn', inputRes.message);
    }

    if (current) applySettings(current);

    hydrateClientContext();

    screen.on('display-added', reflowOverlays);
    screen.on('display-removed', reflowOverlays);
    screen.on('display-metrics-changed', reflowOverlays);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  }).catch((err) => {
    console.error('Startup failed:', err);
    cleanup();
    app.quit();
  });

  app.on('window-all-closed', () => {
  });

  let cleanedUp = false;
  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    flushSettings();
    stopKeepOnTop();
    stopBlockWatch();
    stopInput();
    globalShortcut.unregisterAll();
    forceRestoreSystemCursor();
    releaseClientContext();
    tray?.destroy();
  }

  app.on('before-quit', cleanup);
  app.on('will-quit', cleanup);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(sig, () => {
      cleanup();
      app.quit();
    });
  }
  process.on('exit', () => {
    flushSettings();
    forceRestoreSystemCursor();
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    cleanup();
    app.quit();
  });
}
