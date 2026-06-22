export interface Result<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

export type CursorShape = 'dot' | 'ring' | 'glow' | 'crosshair' | 'plus' | 'diamond' | 'triangle' | 'arrow' | 'roulette';
export type TrailStyle = 'line' | 'comet' | 'dots' | 'ribbon' | 'neon' | 'spark' | 'bubbles';
export type ClickEffect =
  | 'ring' | 'ripple' | 'shockwave' | 'burst' | 'sparkle' | 'confetti' | 'stars' | 'hearts' | 'emoji' | 'text';
export type AssetKind = 'cursor' | 'sound';

export type ColorMode = 'solid' | 'gradient' | 'rainbow' | 'velocity';
export interface ColorConfig {
  mode: ColorMode;
  a: string;
  b: string;
}

export interface GhostConfig {
  enabled: boolean;
  count: number;
  opacity: number;
  delay: number;
}

export interface OutlineConfig {
  enabled: boolean;
  color: string;
  width: number;
}

export interface CursorConfig {
  imageId: string | null;
  shape: CursorShape;
  size: number;
  rotation: number;
  opacity: number;
  hotspotX: number;
  hotspotY: number;
  color: ColorConfig;
  glow: number;
  smoothing: number;
  spin: number;
  pulse: number;
  clickScale: number;
  ghost: GhostConfig;
  outline: OutlineConfig;
}

export interface TrailConfig {
  enabled: boolean;
  style: TrailStyle;
  color: ColorConfig;
  length: number;
  thickness: number;
  fade: number;
  glow: number;
  spacing: number;
}

export interface ClickButtons {
  left: boolean;
  right: boolean;
  middle: boolean;
}

export interface ClickConfig {
  enabled: boolean;
  effect: ClickEffect;
  color: ColorConfig;
  size: number;
  count: number;
  spread: number;
  gravity: number;
  lifetime: number;
  glow: number;
  emoji: string;
  text: string;
  buttons: ClickButtons;
}

export interface SoundConfig {
  enabled: boolean;
  soundId: string | null;
  volume: number;
  pitchJitter: number;
}

export interface BehaviorConfig {
  rainbowSpeed: number;
  hideOnIdle: boolean;
  idleSeconds: number;
}

export interface HotkeyConfig {
  toggle: string;
}

export interface Settings {
  enabled: boolean;
  hideSystemCursor: boolean;
  systemCursorMatch: boolean;
  startWithWindows: boolean;
  onboarded: boolean;
  kryptUsername: string;
  cursor: CursorConfig;
  trail: TrailConfig;
  click: ClickConfig;
  sound: SoundConfig;
  keySound: SoundConfig;
  behavior: BehaviorConfig;
  hotkeys: HotkeyConfig;
  schema: number;
}

export interface CustomPreset {
  id: string;
  name: string;
  settings: Partial<Settings>;
}

export interface AssetMeta {
  id: string;
  kind: AssetKind;
  name: string;
  ext: string;
}

export interface PointerEvent {
  x: number;
  y: number;
}
export interface ClickPulse {
  x: number;
  y: number;
  button: number;
}
export interface KeyPulse {
  keycode: number;
}

export type TrustMode = 'CLEAN' | 'DEGRADED' | 'UNTRUSTED';

export interface AppMeta {
  name: string;
  version: string;
  trust: TrustMode;
  links: { site: string; discord: string; tools: string };
}

export interface KryptBridge {
  app: {
    meta: () => Promise<AppMeta>;
    openExternal: (url: string) => Promise<Result>;
    quit: () => Promise<Result>;
    onNotice: (cb: (n: { level: 'info' | 'warn' | 'error'; message: string }) => void) => () => void;
    takeNotices: () => Promise<{ level: 'info' | 'warn' | 'error'; message: string }[]>;
  };
  settings: {
    get: () => Promise<Settings>;
    update: (patch: Partial<Settings>) => Promise<Result<Settings>>;
    reset: () => Promise<Result<Settings>>;
    onChanged: (cb: (s: Settings) => void) => () => void;
  };
  assets: {
    import: (kind: AssetKind) => Promise<Result<AssetMeta>>;
    list: (kind: AssetKind) => Promise<Result<AssetMeta[]>>;
    remove: (id: string) => Promise<Result>;
    dataUrl: (id: string) => Promise<Result<string>>;
  };
  presets: {
    list: () => Promise<Result<CustomPreset[]>>;
    save: (name: string, settings: Partial<Settings>) => Promise<Result<CustomPreset>>;
    remove: (id: string) => Promise<Result>;
    export: (id: string) => Promise<Result>;
    import: () => Promise<Result<CustomPreset>>;
  };
  overlay: {
    setVisible: (visible: boolean) => Promise<Result>;
    onPointer: (cb: (p: PointerEvent) => void) => () => void;
    onClick: (cb: (c: ClickPulse) => void) => () => void;
    onKey: (cb: (k: KeyPulse) => void) => () => void;
    onActive: (cb: (active: boolean) => void) => () => void;
  };
  system: {
    elevation: () => Promise<{ elevated: boolean; supported: boolean }>;
    relaunchAsAdmin: () => Promise<Result>;
    reportCursorBitmap: (dataUrl: string) => Promise<Result>;
  };
}
