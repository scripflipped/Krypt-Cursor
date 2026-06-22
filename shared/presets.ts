import type { ColorConfig, Settings } from './types';

const solid = (a: string): ColorConfig => ({ mode: 'solid', a, b: a });
const grad = (a: string, b: string): ColorConfig => ({ mode: 'gradient', a, b });
const velo = (a: string, b: string): ColorConfig => ({ mode: 'velocity', a, b });
const rainbow = (): ColorConfig => ({ mode: 'rainbow', a: '#A855F7', b: '#EC4899' });

export interface BuiltinPreset {
  id: string;
  name: string;
  description: string;
  settings: Partial<Settings>;
}

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  {
    id: 'krypt',
    name: 'Krypt',
    description: 'The signature indigo → purple → pink glow.',
    settings: {
      cursor: { shape: 'glow', color: solid('#A855F7'), glow: 0.7, pulse: 0, spin: 0, clickScale: 0.3, smoothing: 0.35 } as Settings['cursor'],
      trail: { enabled: true, style: 'comet', color: grad('#6366F1', '#EC4899'), glow: 0.4, thickness: 6, length: 18 } as Settings['trail'],
      click: { enabled: true, effect: 'ring', color: grad('#6366F1', '#EC4899'), glow: 0.5, size: 36 } as Settings['click'],
    },
  },
  {
    id: 'neon',
    name: 'Neon Pulse',
    description: 'Glowing cyan ring that breathes, with a neon streak.',
    settings: {
      cursor: { shape: 'ring', color: solid('#22D3EE'), glow: 1, pulse: 0.5, clickScale: 0.4 } as Settings['cursor'],
      trail: { enabled: true, style: 'neon', color: solid('#22D3EE'), glow: 1, thickness: 5, length: 24 } as Settings['trail'],
      click: { enabled: true, effect: 'shockwave', color: solid('#22D3EE'), glow: 1, size: 48 } as Settings['click'],
    },
  },
  {
    id: 'rainbow',
    name: 'Rainbow Road',
    description: 'Hue-cycling everything. Loud and proud.',
    settings: {
      cursor: { shape: 'glow', color: rainbow(), glow: 0.8 } as Settings['cursor'],
      trail: { enabled: true, style: 'ribbon', color: rainbow(), glow: 0.6, thickness: 8, length: 28 } as Settings['trail'],
      click: { enabled: true, effect: 'confetti', color: rainbow(), count: 24, size: 40, gravity: 0.4 } as Settings['click'],
      behavior: { rainbowSpeed: 220, hideOnIdle: false, idleSeconds: 4 },
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'A tiny white dot. No trail, barely there.',
    settings: {
      cursor: { shape: 'dot', color: solid('#FFFFFF'), glow: 0, size: 14, clickScale: 0.15, pulse: 0, spin: 0 } as Settings['cursor'],
      trail: { enabled: false } as Settings['trail'],
      click: { enabled: true, effect: 'ring', color: solid('#FFFFFF'), glow: 0, size: 22 } as Settings['click'],
    },
  },
  {
    id: 'gamer',
    name: 'Gamer',
    description: 'Snappy green crosshair with a shockwave on click.',
    settings: {
      cursor: { shape: 'crosshair', color: solid('#22C55E'), glow: 0.5, size: 40, smoothing: 0 } as Settings['cursor'],
      trail: { enabled: false } as Settings['trail'],
      click: { enabled: true, effect: 'shockwave', color: solid('#22C55E'), glow: 0.6, size: 40 } as Settings['click'],
    },
  },
  {
    id: 'fire',
    name: 'Inferno',
    description: 'Velocity-reactive embers that rise on click.',
    settings: {
      cursor: { shape: 'glow', color: solid('#FB923C'), glow: 1, clickScale: 0.4 } as Settings['cursor'],
      trail: { enabled: true, style: 'spark', color: velo('#F59E0B', '#EF4444'), glow: 0.8, thickness: 8, length: 22 } as Settings['trail'],
      click: { enabled: true, effect: 'burst', color: grad('#F59E0B', '#EF4444'), count: 26, gravity: -0.4, glow: 0.8, size: 38 } as Settings['click'],
    },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Soft pink bubbles and falling hearts.',
    settings: {
      cursor: { shape: 'glow', color: solid('#F9A8D4'), glow: 0.6 } as Settings['cursor'],
      trail: { enabled: true, style: 'bubbles', color: solid('#F9A8D4'), glow: 0.3, thickness: 5, length: 16 } as Settings['trail'],
      click: { enabled: true, effect: 'hearts', color: grad('#F472B6', '#EC4899'), count: 12, gravity: 0.35, size: 34 } as Settings['click'],
    },
  },
  {
    id: 'stardust',
    name: 'Stardust',
    description: 'A spinning diamond shedding stars.',
    settings: {
      cursor: { shape: 'diamond', color: solid('#C4B5FD'), glow: 0.7, spin: 60 } as Settings['cursor'],
      trail: { enabled: true, style: 'dots', color: grad('#818CF8', '#C4B5FD'), glow: 0.5, thickness: 5, length: 20 } as Settings['trail'],
      click: { enabled: true, effect: 'stars', color: grad('#818CF8', '#FDE68A'), count: 18, size: 36, gravity: 0.1 } as Settings['click'],
    },
  },
  {
    id: 'roulette',
    name: 'Roulette',
    description: 'A tiny red/black/green wheel that spins on click.',
    settings: {
      cursor: { shape: 'roulette', color: solid('#FFFFFF'), size: 40, glow: 0.35, spin: 0, pulse: 0, clickScale: 0, smoothing: 0.3, rotation: 0 } as Settings['cursor'],
      trail: { enabled: false } as Settings['trail'],
      click: { enabled: true, effect: 'ring', color: solid('#FFFFFF'), glow: 0.3, size: 24, count: 10 } as Settings['click'],
    },
  },
  {
    id: 'party',
    name: 'Party',
    description: 'Confetti, emoji and a rainbow streak. 🎉',
    settings: {
      cursor: { shape: 'glow', color: rainbow(), glow: 0.7 } as Settings['cursor'],
      trail: { enabled: true, style: 'comet', color: rainbow(), glow: 0.5, thickness: 6, length: 20 } as Settings['trail'],
      click: { enabled: true, effect: 'emoji', emoji: '🎉🎊✨🥳🪩', count: 14, size: 44, gravity: 0.5 } as Settings['click'],
      behavior: { rainbowSpeed: 300, hideOnIdle: false, idleSeconds: 4 },
    },
  },
];
