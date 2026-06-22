import koffi from 'koffi';

const SHELL_CLASSES = new Set(['Shell_TrayWnd', 'Shell_SecondaryTrayWnd']);
const SHELL_HOSTS = new Set([
  'startmenuexperiencehost.exe',
  'searchhost.exe',
  'searchapp.exe',
  'searchui.exe',
  'shellexperiencehost.exe',
]);
const DESKTOP_CLASSES = new Set(['Progman', 'WorkerW']);
const SECURITY_MANDATORY_HIGH_RID = 0x3000;
const SECURITY_MANDATORY_MEDIUM_RID = 0x2000;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const TOKEN_QUERY = 0x0008;
const TokenIntegrityLevel = 25;
const GA_ROOT = 2;
const GWL_STYLE = -16;
const WS_CAPTION = 0x00c00000;
const MONITOR_DEFAULTTONEAREST = 2;
const CURSOR_SHOWING = 0x00000001;

type Handle = number | bigint;
interface Rect { left: number; top: number; right: number; bottom: number }
interface MonitorInfo { cbSize: number; rcMonitor: Rect; rcWork: Rect; dwFlags: number }
interface CursorInfo { cbSize: number; flags: number; hCursor: Handle; ptScreenPos: { x: number; y: number } }

interface Api {
  GetForegroundWindow: () => Handle;
  WindowFromPoint: (pt: { x?: number; y?: number }) => Handle;
  GetCursorPos: (pt: { x?: number; y?: number }) => boolean;
  GetCursorInfo: (ci: CursorInfo) => boolean;
  GetWindowThreadProcessId: (hwnd: Handle, pid: number[]) => number;
  GetClassNameW: (hwnd: Handle, buf: Buffer, max: number) => number;
  GetAncestor: (hwnd: Handle, flags: number) => Handle;
  GetWindowLongW: (hwnd: Handle, index: number) => number;
  GetWindowRect: (hwnd: Handle, rect: Rect) => boolean;
  MonitorFromWindow: (hwnd: Handle, flags: number) => Handle;
  GetMonitorInfoW: (hmon: Handle, mi: MonitorInfo) => boolean;
  GetCurrentProcess: () => Handle;
  OpenProcess: (access: number, inherit: boolean, pid: number) => Handle;
  CloseHandle: (h: Handle) => boolean;
  OpenProcessToken: (proc: Handle, access: number, token: bigint[]) => boolean;
  GetTokenInformation: (token: Handle, cls: number, info: Buffer, len: number, retlen: number[]) => boolean;
  QueryFullProcessImageNameW: (proc: Handle, flags: number, buf: Buffer, size: number[]) => boolean;
}

interface WinInfo {
  rid: number;
  exe: string;
}

let api: Api | null = null;
let loaded = false;
let ownRid = SECURITY_MANDATORY_MEDIUM_RID;
let cursorInfoSize = 24;
const infoCache = new Map<string, WinInfo>();

function load(): Api | null {
  if (loaded) return api;
  loaded = true;
  if (process.platform !== 'win32') return (api = null);
  try {
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    const advapi32 = koffi.load('advapi32.dll');
    koffi.struct('POINT', { x: 'int32', y: 'int32' });
    koffi.struct('RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' });
    koffi.struct('MONITORINFO', { cbSize: 'uint32', rcMonitor: 'RECT', rcWork: 'RECT', dwFlags: 'uint32' });
    koffi.struct('CURSORINFO', { cbSize: 'uint32', flags: 'uint32', hCursor: 'uintptr_t', ptScreenPos: 'POINT' });
    cursorInfoSize = koffi.sizeof('CURSORINFO');
    api = {
      GetForegroundWindow: user32.func('uintptr_t GetForegroundWindow()') as Api['GetForegroundWindow'],
      WindowFromPoint: user32.func('uintptr_t WindowFromPoint(POINT pt)') as Api['WindowFromPoint'],
      GetCursorPos: user32.func('bool GetCursorPos(_Out_ POINT* pt)') as Api['GetCursorPos'],
      GetCursorInfo: user32.func('bool GetCursorInfo(_Inout_ CURSORINFO* ci)') as Api['GetCursorInfo'],
      GetWindowThreadProcessId: user32.func('uint32 GetWindowThreadProcessId(uintptr_t hwnd, _Out_ uint32* pid)') as Api['GetWindowThreadProcessId'],
      GetClassNameW: user32.func('int GetClassNameW(uintptr_t hwnd, _Out_ uint16* buf, int max)') as Api['GetClassNameW'],
      GetAncestor: user32.func('uintptr_t GetAncestor(uintptr_t hwnd, uint32 flags)') as Api['GetAncestor'],
      GetWindowLongW: user32.func('uint32 GetWindowLongW(uintptr_t hwnd, int index)') as Api['GetWindowLongW'],
      GetWindowRect: user32.func('bool GetWindowRect(uintptr_t hwnd, _Out_ RECT* rect)') as Api['GetWindowRect'],
      MonitorFromWindow: user32.func('uintptr_t MonitorFromWindow(uintptr_t hwnd, uint32 flags)') as Api['MonitorFromWindow'],
      GetMonitorInfoW: user32.func('bool GetMonitorInfoW(uintptr_t hmon, _Inout_ MONITORINFO* mi)') as Api['GetMonitorInfoW'],
      GetCurrentProcess: kernel32.func('uintptr_t GetCurrentProcess()') as Api['GetCurrentProcess'],
      OpenProcess: kernel32.func('uintptr_t OpenProcess(uint32 access, bool inherit, uint32 pid)') as Api['OpenProcess'],
      CloseHandle: kernel32.func('bool CloseHandle(uintptr_t h)') as Api['CloseHandle'],
      OpenProcessToken: advapi32.func('bool OpenProcessToken(uintptr_t proc, uint32 access, _Out_ uintptr_t* token)') as Api['OpenProcessToken'],
      GetTokenInformation: advapi32.func('bool GetTokenInformation(uintptr_t token, int cls, _Out_ void* info, uint32 len, _Out_ uint32* retlen)') as Api['GetTokenInformation'],
      QueryFullProcessImageNameW: kernel32.func('bool QueryFullProcessImageNameW(uintptr_t proc, uint32 flags, _Out_ uint16* buf, _Inout_ uint32* size)') as Api['QueryFullProcessImageNameW'],
    };
    ownRid = tokenRid(api.GetCurrentProcess()) ?? SECURITY_MANDATORY_MEDIUM_RID;
    return api;
  } catch {
    return (api = null);
  }
}

function tokenRid(hProc: Handle): number | null {
  const w = api;
  if (!w || !hProc) return null;
  const tok: bigint[] = [0n];
  if (!w.OpenProcessToken(hProc, TOKEN_QUERY, tok) || !tok[0]) return null;
  try {
    const info = Buffer.alloc(64);
    const retlen: number[] = [0];
    if (!w.GetTokenInformation(tok[0], TokenIntegrityLevel, info, info.length, retlen)) return null;
    return ridFromTokenBuffer(info, retlen[0] || info.length);
  } finally {
    w.CloseHandle(tok[0]);
  }
}

function ridFromTokenBuffer(buf: Buffer, len: number): number {
  for (let i = 0; i + 12 <= len; i++) {
    if (buf[i] === 1 && buf[i + 1] === 1 && buf[i + 2] === 0 && buf[i + 3] === 0 &&
        buf[i + 4] === 0 && buf[i + 5] === 0 && buf[i + 6] === 0 && buf[i + 7] === 0x10) {
      return buf.readUInt32LE(i + 8);
    }
  }
  return -1;
}

function imageName(hProc: Handle): string {
  const w = api;
  if (!w || !hProc) return '';
  const cap = 260;
  const buf = Buffer.alloc(cap * 2);
  const size: number[] = [cap];
  if (!w.QueryFullProcessImageNameW(hProc, 0, buf, size)) return '';
  const full = buf.toString('utf16le', 0, (size[0] || 0) * 2);
  return full.split(/[\\/]/).pop()?.toLowerCase() ?? '';
}

function windowInfo(hwnd: Handle): WinInfo {
  const w = api;
  if (!w || !hwnd) return { rid: -1, exe: '' };
  const key = String(hwnd);
  const cached = infoCache.get(key);
  if (cached !== undefined) return cached;

  let info: WinInfo = { rid: -1, exe: '' };
  const pidArr: number[] = [0];
  w.GetWindowThreadProcessId(hwnd, pidArr);
  const pid = pidArr[0];
  if (pid) {
    const h = w.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
    if (h) {
      try {
        info = { rid: tokenRid(h) ?? -1, exe: imageName(h) };
      } finally {
        w.CloseHandle(h);
      }
    }
  }
  if (infoCache.size > 128) infoCache.clear();
  infoCache.set(key, info);
  return info;
}

function isUncoverableIntegrity(rid: number): boolean {
  return rid >= SECURITY_MANDATORY_HIGH_RID && rid > ownRid;
}

function classNameOf(hwnd: Handle): string {
  const w = api;
  if (!w || !hwnd) return '';
  const buf = Buffer.alloc(256 * 2);
  const n = w.GetClassNameW(hwnd, buf, 256);
  return n > 0 ? buf.toString('utf16le', 0, n * 2) : '';
}

function isUncoverable(hwnd: Handle): boolean {
  if (SHELL_CLASSES.has(classNameOf(hwnd))) return true;
  const info = windowInfo(hwnd);
  if (SHELL_HOSTS.has(info.exe)) return true;
  return isUncoverableIntegrity(info.rid);
}

function isFullscreenApp(hwnd: Handle): boolean {
  const w = api;
  if (!w || !hwnd) return false;
  const cls = classNameOf(hwnd);
  if (DESKTOP_CLASSES.has(cls) || SHELL_CLASSES.has(cls)) return false;
  const style = w.GetWindowLongW(hwnd, GWL_STYLE) >>> 0;
  if ((style & WS_CAPTION) === WS_CAPTION) return false;
  const rect: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
  if (!w.GetWindowRect(hwnd, rect)) return false;
  const mi: MonitorInfo = { cbSize: 40, rcMonitor: { left: 0, top: 0, right: 0, bottom: 0 }, rcWork: { left: 0, top: 0, right: 0, bottom: 0 }, dwFlags: 0 };
  if (!w.GetMonitorInfoW(w.MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), mi)) return false;
  const m = mi.rcMonitor;
  return rect.left <= m.left && rect.top <= m.top && rect.right >= m.right && rect.bottom >= m.bottom;
}

function cursorHidden(): boolean {
  const w = api;
  if (!w) return false;
  const ci: CursorInfo = { cbSize: cursorInfoSize, flags: 0, hCursor: 0, ptScreenPos: { x: 0, y: 0 } };
  if (!w.GetCursorInfo(ci)) return false;
  return (ci.flags & CURSOR_SHOWING) === 0;
}

export function needsSystemCursor(): boolean {
  const w = load();
  if (!w) return false;
  try {
    if (cursorHidden()) return true;

    const fg = w.GetForegroundWindow();
    if (fg && (isUncoverable(fg) || isFullscreenApp(fg))) return true;

    const pt: { x?: number; y?: number } = {};
    if (w.GetCursorPos(pt)) {
      const hwnd = w.WindowFromPoint(pt);
      if (hwnd) {
        const root = w.GetAncestor(hwnd, GA_ROOT) || hwnd;
        if (isUncoverable(root)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
