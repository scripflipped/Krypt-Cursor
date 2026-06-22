import { screen } from 'electron';
import { uIOhook } from 'uiohook-napi';

export interface GlobalPoint {
  x: number;
  y: number;
}
export interface GlobalClick {
  x: number;
  y: number;
  button: number;
}

interface Handlers {
  onPointer: (p: GlobalPoint) => void;
  onClick: (c: GlobalClick) => void;
  onKey: (keycode: number) => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let hookActive = false;
let last: GlobalPoint = { x: 0, y: 0 };
let lastEmit = 0;
const down = new Set<number>();

const MIN_EMIT_MS = 6;

export function startInput(h: Handlers): { ok: boolean; message: string; hookActive: boolean } {
  stopInput();

  const emitNow = (): void => {
    lastEmit = performance.now();
    const p = screen.getCursorScreenPoint();
    if (p.x !== last.x || p.y !== last.y) {
      last = p;
      h.onPointer(p);
    }
  };
  const onMove = (): void => {
    const dt = performance.now() - lastEmit;
    if (dt >= MIN_EMIT_MS) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      emitNow();
    } else if (!flushTimer) {
      flushTimer = setTimeout(() => { flushTimer = null; emitNow(); }, MIN_EMIT_MS - dt);
    }
  };

  try {
    uIOhook.removeAllListeners('mousemove');
    uIOhook.removeAllListeners('mousedown');
    uIOhook.removeAllListeners('keydown');
    uIOhook.removeAllListeners('keyup');
    uIOhook.on('mousemove', onMove);
    uIOhook.on('mousedown', (e) => {
      const p = screen.getCursorScreenPoint();
      last = p;
      h.onClick({ x: p.x, y: p.y, button: (e as { button?: number }).button ?? 1 });
    });
    uIOhook.on('keydown', (e) => {
      const code = (e as { keycode?: number }).keycode ?? 0;
      if (down.has(code)) return;
      down.add(code);
      h.onKey(code);
    });
    uIOhook.on('keyup', (e) => down.delete((e as { keycode?: number }).keycode ?? 0));
    uIOhook.start();
    hookActive = true;
    return { ok: true, message: 'Cursor tracking active.', hookActive: true };
  } catch (e) {
    hookActive = false;
    pollTimer = setInterval(() => {
      const p = screen.getCursorScreenPoint();
      if (p.x !== last.x || p.y !== last.y) {
        last = p;
        h.onPointer(p);
      }
    }, 33);
    return {
      ok: true,
      message: `Click effects unavailable (input hook failed: ${(e as Error).message}).`,
      hookActive: false,
    };
  }
}

export function stopInput(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  down.clear();
  if (hookActive) {
    try {
      uIOhook.removeAllListeners('mousemove');
      uIOhook.removeAllListeners('mousedown');
      uIOhook.removeAllListeners('keydown');
      uIOhook.removeAllListeners('keyup');
      uIOhook.stop();
    } catch {
    }
    hookActive = false;
  }
}
