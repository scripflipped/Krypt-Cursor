import { createEngine } from '../fx/engine';
import { createSoundPlayer } from '../fx/sound';
import type { Settings } from '../../shared/types';

const canvas = document.getElementById('overlay-canvas') as HTMLCanvasElement;
const engine = createEngine(canvas);
const sound = createSoundPlayer('click');
const keySound = createSoundPlayer('key');

let cursorImageId: string | null = null;
let latest: Settings | null = null;
let prevMatch = false;

let reportTimer: ReturnType<typeof setTimeout> | null = null;
let lastReported = '';

function reportCursorBitmap(): void {
  if (!latest || !latest.systemCursorMatch) return;
  const url = engine.renderCursor(32);
  if (!url || url === lastReported) return;
  lastReported = url;
  void window.krypt.system.reportCursorBitmap(url);
}

function scheduleCursorReport(): void {
  if (!latest?.systemCursorMatch) return;
  if (reportTimer) clearTimeout(reportTimer);
  reportTimer = setTimeout(reportCursorBitmap, 180);
}

async function loadCursorImage(id: string | null): Promise<void> {
  if (!id) {
    engine.setCursorImage(null);
    cursorImageId = null;
    scheduleCursorReport();
    return;
  }
  if (id === cursorImageId) return;
  cursorImageId = id;
  try {
    const res = await window.krypt.assets.dataUrl(id);
    if (res.ok && res.data) {
      const img = new Image();
      img.onload = () => { engine.setCursorImage(img); scheduleCursorReport(); };
      img.src = res.data;
    } else {
      engine.setCursorImage(null);
    }
  } catch {
    engine.setCursorImage(null);
  }
}

function apply(s: Settings): void {
  latest = s;
  if (s.systemCursorMatch && !prevMatch) lastReported = '';
  prevMatch = s.systemCursorMatch;
  engine.setSettings(s);
  sound.setConfig(s.sound);
  keySound.setConfig(s.keySound);
  void loadCursorImage(s.cursor.imageId);
  scheduleCursorReport();
}

async function boot(): Promise<void> {
  const s = await window.krypt.settings.get();
  apply(s);
  engine.start();
}

window.krypt.settings.onChanged(apply);
window.krypt.overlay.onPointer((p) => engine.setPointer(p.x, p.y));
window.krypt.overlay.onClick((c) => {
  engine.emitClick(c.x, c.y, c.button);
  sound.play();
});
window.krypt.overlay.onKey(() => keySound.play());
window.krypt.overlay.onActive((a) => engine.setActive(a));
window.addEventListener('resize', () => engine.resize());

void boot();
