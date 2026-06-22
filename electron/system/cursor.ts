import koffi from 'koffi';

const OCR_IDS = [
  32512, 32513, 32514, 32515, 32516, 32640, 32641, 32642, 32643, 32644, 32645,
  32646, 32648, 32649, 32650, 32651,
];
const SPI_SETCURSORS = 0x0057;
const IMAGE_CURSOR = 2;
const LR_LOADFROMFILE = 0x0010;
const LR_DEFAULTSIZE = 0x0040;

interface Win32 {
  CreateCursor: (h: null, x: number, y: number, w: number, ht: number, andP: Buffer, xorP: Buffer) => unknown;
  CopyIcon: (h: unknown) => unknown;
  SetSystemCursor: (h: unknown, id: number) => boolean;
  SystemParametersInfoW: (a: number, b: number, c: null, d: number) => boolean;
  LoadImageW: (h: null, name: string, type: number, cx: number, cy: number, load: number) => unknown;
  DestroyCursor: (h: unknown) => boolean;
}

let api: Win32 | null = null;
let replaced = false;

function load(): Win32 | null {
  if (api) return api;
  try {
    const user32 = koffi.load('user32.dll');
    api = {
      CreateCursor: user32.func('void* CreateCursor(void* hInst, int x, int y, int w, int h, void* andPlane, void* xorPlane)') as Win32['CreateCursor'],
      CopyIcon: user32.func('void* CopyIcon(void* h)') as Win32['CopyIcon'],
      SetSystemCursor: user32.func('bool SetSystemCursor(void* h, uint32 id)') as Win32['SetSystemCursor'],
      SystemParametersInfoW: user32.func('bool SystemParametersInfoW(uint32 a, uint32 b, void* c, uint32 d)') as Win32['SystemParametersInfoW'],
      LoadImageW: user32.func('void* LoadImageW(void* hInst, str16 name, uint32 type, int cx, int cy, uint32 load)') as Win32['LoadImageW'],
      DestroyCursor: user32.func('bool DestroyCursor(void* h)') as Win32['DestroyCursor'],
    };
    return api;
  } catch {
    return null;
  }
}

export function initSystemCursor(): void {
  load();
}

export function hideSystemCursor(): { ok: boolean; message: string } {
  const w = load();
  if (!w) return { ok: false, message: 'System cursor hiding unavailable on this machine.' };
  try {
    const width = 32;
    const bytes = (width / 8) * width;
    const andPlane = Buffer.alloc(bytes, 0xff);
    const xorPlane = Buffer.alloc(bytes, 0x00);
    const blank = w.CreateCursor(null, 0, 0, width, width, andPlane, xorPlane);
    if (!blank) return { ok: false, message: 'Could not create blank cursor.' };
    for (const id of OCR_IDS) {
      const copy = w.CopyIcon(blank);
      if (copy) w.SetSystemCursor(copy, id);
    }
    replaced = true;
    return { ok: true, message: 'System cursor hidden.' };
  } catch (e) {
    return { ok: false, message: `Hide failed: ${(e as Error).message}` };
  }
}

export function matchSystemCursor(path: string): { ok: boolean; message: string } {
  const w = load();
  if (!w) return { ok: false, message: 'System cursor replacement unavailable on this machine.' };
  try {
    const handle = w.LoadImageW(null, path, IMAGE_CURSOR, 0, 0, LR_LOADFROMFILE | LR_DEFAULTSIZE);
    if (!handle) return { ok: false, message: 'Could not load the matched cursor file.' };
    let applied = false;
    for (const id of OCR_IDS) {
      const copy = w.CopyIcon(handle);
      if (copy && w.SetSystemCursor(copy, id)) applied = true;
    }
    w.DestroyCursor(handle);
    replaced = replaced || applied;
    return applied
      ? { ok: true, message: 'System cursor matched.' }
      : { ok: false, message: 'Could not apply the matched cursor.' };
  } catch (e) {
    return { ok: false, message: `Match failed: ${(e as Error).message}` };
  }
}

export function restoreSystemCursor(): { ok: boolean; message: string } {
  if (!replaced) return { ok: true, message: 'System cursor already real.' };
  const w = load();
  if (!w) {
    replaced = false;
    return { ok: true, message: 'Nothing to restore.' };
  }
  try {
    w.SystemParametersInfoW(SPI_SETCURSORS, 0, null, 0);
    replaced = false;
    return { ok: true, message: 'System cursor restored.' };
  } catch (e) {
    return { ok: false, message: `Restore failed: ${(e as Error).message}` };
  }
}

export function forceRestoreSystemCursor(): void {
  try {
    const w = load();
    w?.SystemParametersInfoW(SPI_SETCURSORS, 0, null, 0);
    replaced = false;
  } catch {
  }
}

export function isReplaced(): boolean {
  return replaced;
}
