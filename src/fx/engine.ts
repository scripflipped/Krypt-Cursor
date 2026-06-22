import type { ClickConfig, ColorConfig, Settings, TrailConfig } from '../../shared/types';
import { splitEmojis } from '../utils/format';

type RGB = [number, number, number];

interface TrailPoint { x: number; y: number; born: number; vel: number }
interface Particle {
  x: number; y: number; vx: number; vy: number; born: number; life: number;
  t0: number; rot: number; vrot: number;
  glyph?: string;
}
interface Burst {
  effect: ClickConfig['effect'];
  x: number; y: number; born: number; life: number;
  size: number; glow: number; gravity: number;
  color: ColorConfig; emoji: string; text: string;
  particles: Particle[];
}

const now = (): number => performance.now();

function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [168, 85, 247];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpRgb(a: RGB, b: RGB, f: number): RGB {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360 / 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
function rgba(c: RGB, alpha: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
}

const VEL_REF = 36;

const OUTLINE_STAMPS = 12;

const ROULETTE_SEGMENTS = 12;
const ROULETTE_FRICTION = 0.97;

function rouletteSegColor(i: number): string {
  if (i === 0) return '#16A34A';
  return i % 2 === 1 ? '#DC2626' : '#27272A';
}

function buildSilhouette(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const w = Math.max(1, img.naturalWidth);
  const h = Math.max(1, img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0, w, h);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, w, h);
  return c;
}

export interface FxEngine {
  setSettings(s: Settings): void;
  setCursorImage(img: HTMLImageElement | null): void;
  renderCursor(px?: number): string | null;
  setPointer(x: number, y: number): void;
  emitClick(x: number, y: number, button?: number): void;
  setActive(active: boolean): void;
  resize(): void;
  start(): void;
  stop(): void;
}

export function createEngine(canvas: HTMLCanvasElement): FxEngine {
  const ctx = canvas.getContext('2d')!;
  let settings: Settings | null = null;
  let cursorImg: HTMLImageElement | null = null;
  let cursorSilhouette: HTMLCanvasElement | null = null;
  let silhouetteColor = '';

  const target = { x: -1, y: -1 };
  const smooth = { x: -1, y: -1 };
  let velocity = 0;
  let trail: TrailPoint[] = [];
  let ghosts: { x: number; y: number }[] = [];
  let bursts: Burst[] = [];
  let raf = 0;
  let cssW = 0;
  let cssH = 0;
  let spinAngle = 0;
  let rouletteAngle = 0;
  let rouletteVel = 0;
  let rouletteTarget: number | null = null;
  let lastClickAt = -1e9;
  let lastMoveAt = -1e9;
  let lastFrame = now();
  let timeMs = 0;
  let rainbowSpeed = 120;
  let active = true;

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width || canvas.clientWidth || window.innerWidth;
    cssH = rect.height || canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setPointer(x: number, y: number): void {
    target.x = x;
    target.y = y;
    lastMoveAt = now();
    if (smooth.x < 0) { smooth.x = x; smooth.y = y; }
  }

  function resolve(cfg: ColorConfig, t = 0, phase = 0): RGB {
    switch (cfg.mode) {
      case 'solid': return hexToRgb(cfg.a);
      case 'gradient': return lerpRgb(hexToRgb(cfg.a), hexToRgb(cfg.b), t);
      case 'rainbow': return hslToRgb((timeMs / 1000) * rainbowSpeed + t * 360 + phase, 1, 0.6);
      case 'velocity': return lerpRgb(hexToRgb(cfg.a), hexToRgb(cfg.b), Math.min(1, velocity / VEL_REF));
      default: return hexToRgb(cfg.a);
    }
  }

  function emitClick(x: number, y: number, button = 1): void {
    lastClickAt = now();
    if (!settings) return;
    if (settings.cursor.shape === 'roulette') {
      rouletteVel += 700 + Math.random() * 900;
      rouletteTarget = null;
    }
    const c = settings.click;
    const allowed = button === 2 ? c.buttons.right : button === 3 ? c.buttons.middle : c.buttons.left;
    if (!c.enabled || !allowed) return;

    const glyphs = c.effect === 'emoji' ? splitEmojis(c.emoji) : [];
    const life = (c.effect === 'ripple' ? 760 : c.effect === 'shockwave' ? 520 : 620) * (0.5 + c.lifetime);
    const burst: Burst = {
      effect: c.effect, x, y, born: now(), life,
      size: c.size, glow: c.glow, gravity: c.gravity,
      color: c.color, emoji: glyphs[0] || '✨', text: c.text || 'nice', particles: [],
    };

    const PARTICLE = ['burst', 'sparkle', 'confetti', 'stars', 'hearts', 'emoji'];
    if (PARTICLE.includes(c.effect)) {
      const n = Math.max(3, Math.min(80, Math.round(c.count)));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * (0.4 + c.spread * 3);
        const speed = (c.size / 16) * (0.7 + Math.random() * (0.6 + c.spread * 2.2));
        burst.particles.push({
          x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
          born: now(), life: (520 + Math.random() * 320) * (0.5 + c.lifetime),
          t0: i / n, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
          glyph: glyphs.length ? glyphs[(Math.random() * glyphs.length) | 0] : undefined,
        });
      }
    }
    bursts.push(burst);
    if (bursts.length > 60) bursts = bursts.slice(-60);
  }

  function drawTrail(tc: TrailConfig, life: number): void {
    if (trail.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const glow = tc.glow * 18;

    if (tc.style === 'dots' || tc.style === 'bubbles') {
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        const age = (timeMs - p.born) / life;
        if (age > 1) continue;
        const a = 1 - age;
        const r = (tc.thickness / 2) * (1 - age * 0.5) * (tc.style === 'bubbles' ? 1.6 : 1);
        const col = resolve(tc.color, i / trail.length, 0);
        ctx.shadowBlur = glow; ctx.shadowColor = rgba(col, a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2);
        if (tc.style === 'bubbles') { ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(col, a * 0.9); ctx.stroke(); }
        else { ctx.fillStyle = rgba(col, a * 0.9); ctx.fill(); }
      }
      ctx.shadowBlur = 0;
      return;
    }

    if (tc.style === 'spark') {
      for (let i = 1; i < trail.length; i++) {
        const p = trail[i];
        const age = (timeMs - p.born) / life;
        if (age > 1) continue;
        const a = 1 - age;
        const col = resolve(tc.color, i / trail.length, 0);
        const s = tc.thickness * (1 - age);
        const ang = Math.random() * Math.PI * 2;
        ctx.strokeStyle = rgba(col, a);
        ctx.shadowBlur = glow; ctx.shadowColor = rgba(col, a);
        ctx.lineWidth = Math.max(0.6, s * 0.4);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ang) * s, p.y + Math.sin(ang) * s);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      return;
    }

    const taper = tc.style === 'line' ? 1 : tc.style === 'comet' ? 0.12 : 0.04;
    const extraGlow = tc.style === 'neon' ? 14 : tc.style === 'ribbon' ? 8 : 0;
    ctx.shadowBlur = glow + extraGlow;
    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const frac = i / trail.length;
      const age = (timeMs - p1.born) / life;
      if (age > 1) continue;
      const a = (1 - age) * (0.3 + frac * 0.7);
      const w = tc.thickness * (taper + (1 - taper) * frac);
      const col = resolve(tc.color, frac, 0);
      ctx.strokeStyle = rgba(col, a);
      ctx.shadowColor = rgba(col, a);
      ctx.lineWidth = Math.max(0.5, w);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  function star(cx: number, cy: number, r: number, rot: number): void {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = rot + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function heart(cx: number, cy: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.3);
    ctx.bezierCurveTo(cx + r, cy - r * 0.6, cx + r * 0.5, cy - r, cx, cy - r * 0.35);
    ctx.bezierCurveTo(cx - r * 0.5, cy - r, cx - r, cy - r * 0.6, cx, cy + r * 0.3);
    ctx.closePath();
  }

  function drawBursts(): void {
    bursts = bursts.filter((b) => timeMs - b.born < b.life);
    for (const b of bursts) {
      const age = (timeMs - b.born) / b.life;
      const glow = b.glow * 22;

      if (b.effect === 'ring' || b.effect === 'ripple' || b.effect === 'shockwave') {
        const rings = b.effect === 'ripple' ? 3 : 1;
        const grow = b.effect === 'shockwave' ? 2.6 : 1.5;
        ctx.shadowBlur = glow;
        for (let k = 0; k < rings; k++) {
          const local = age - k * 0.16;
          if (local < 0 || local > 1) continue;
          const r = b.size * (0.2 + local * grow);
          const a = (1 - local) * 0.9;
          const col = resolve(b.color, 0.3 + k * 0.25, 0);
          ctx.shadowColor = rgba(col, a);
          ctx.strokeStyle = rgba(col, a);
          ctx.lineWidth = Math.max(1, b.size * (b.effect === 'shockwave' ? 0.18 : 0.1) * (1 - local));
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        continue;
      }

      if (b.effect === 'text') {
        const a = 1 - age;
        const col = resolve(b.color, 0, 0);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowBlur = glow; ctx.shadowColor = rgba(col, a);
        ctx.fillStyle = rgba(col, 1);
        ctx.font = `700 ${Math.round(b.size * 0.7)}px "Chakra Petch", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(b.text, b.x, b.y - age * b.size * 1.5);
        ctx.restore();
        continue;
      }

      ctx.shadowBlur = glow;
      for (const p of b.particles) {
        const pl = (timeMs - p.born) / p.life;
        if (pl > 1) continue;
        const tt = timeMs - p.born;
        const px = p.x + p.vx * tt * 0.06;
        const py = p.y + p.vy * tt * 0.06 + b.gravity * tt * tt * 0.00006;
        const a = 1 - pl;
        const col = resolve(b.color, p.t0, p.t0 * 60);
        ctx.shadowColor = rgba(col, a);
        const rot = p.rot + p.vrot * tt * 0.05;

        if (b.effect === 'sparkle') {
          const s = Math.max(1, b.size * 0.16 * (1 - pl));
          ctx.strokeStyle = rgba(col, a);
          ctx.lineWidth = Math.max(0.8, s * 0.4);
          ctx.beginPath();
          ctx.moveTo(px - s, py); ctx.lineTo(px + s, py);
          ctx.moveTo(px, py - s); ctx.lineTo(px, py + s);
          ctx.stroke();
        } else if (b.effect === 'confetti') {
          const s = Math.max(2, b.size * 0.16);
          ctx.save();
          ctx.translate(px, py); ctx.rotate(rot);
          ctx.fillStyle = rgba(col, a);
          ctx.fillRect(-s / 2, -s / 4, s, s / 2);
          ctx.restore();
        } else if (b.effect === 'stars') {
          ctx.fillStyle = rgba(col, a);
          star(px, py, Math.max(1.5, b.size * 0.16 * (1 - pl * 0.4)), rot);
          ctx.fill();
        } else if (b.effect === 'hearts') {
          ctx.fillStyle = rgba(col, a);
          heart(px, py, Math.max(1.5, b.size * 0.16 * (1 - pl * 0.3)));
          ctx.fill();
        } else if (b.effect === 'emoji') {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.font = `${Math.round(b.size * 0.6)}px serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(p.glyph || b.emoji, px, py);
          ctx.restore();
        } else {
          ctx.fillStyle = rgba(col, a);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.6, b.size * 0.09 * (1 - pl)), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    }
  }

  function drawShape(g: CanvasRenderingContext2D, shape: string, col: RGB, R: number, glow: number): void {
    g.shadowBlur = glow;
    g.shadowColor = rgba(col, 0.9);
    const stroke = (w: number) => { g.lineWidth = w; g.strokeStyle = rgba(col, 1); };
    const fill = () => { g.fillStyle = rgba(col, 1); };

    switch (shape) {
      case 'glow':
        g.shadowBlur = glow * 2.2;
        fill(); g.beginPath(); g.arc(0, 0, R * 0.5, 0, Math.PI * 2); g.fill();
        break;
      case 'ring':
        stroke(Math.max(1.5, R * 0.22)); g.beginPath(); g.arc(0, 0, R * 0.8, 0, Math.PI * 2); g.stroke();
        fill(); g.beginPath(); g.arc(0, 0, R * 0.16, 0, Math.PI * 2); g.fill();
        break;
      case 'crosshair': {
        const gap = R * 0.35;
        stroke(Math.max(1.2, R * 0.12));
        g.beginPath();
        g.moveTo(-R, 0); g.lineTo(-gap, 0); g.moveTo(gap, 0); g.lineTo(R, 0);
        g.moveTo(0, -R); g.lineTo(0, -gap); g.moveTo(0, gap); g.lineTo(0, R);
        g.stroke();
        fill(); g.beginPath(); g.arc(0, 0, R * 0.1, 0, Math.PI * 2); g.fill();
        break;
      }
      case 'plus':
        fill();
        g.fillRect(-R * 0.16, -R, R * 0.32, R * 2);
        g.fillRect(-R, -R * 0.16, R * 2, R * 0.32);
        break;
      case 'diamond':
        fill(); g.beginPath();
        g.moveTo(0, -R); g.lineTo(R * 0.75, 0); g.lineTo(0, R); g.lineTo(-R * 0.75, 0);
        g.closePath(); g.fill();
        break;
      case 'triangle':
        fill(); g.beginPath();
        g.moveTo(0, -R); g.lineTo(R * 0.87, R * 0.6); g.lineTo(-R * 0.87, R * 0.6);
        g.closePath(); g.fill();
        break;
      case 'arrow':
        fill();
        g.beginPath();
        g.moveTo(-R, -R);
        g.lineTo(-R + R * 1.4, -R + R * 0.55);
        g.lineTo(-R + R * 0.55, -R + R * 0.7);
        g.lineTo(-R + R * 0.95, -R + R * 1.55);
        g.lineTo(-R + R * 0.6, -R + R * 1.7);
        g.lineTo(-R + R * 0.25, -R + R * 0.85);
        g.lineTo(-R, -R + R * 0.55);
        g.closePath(); g.fill();
        g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.5)'; g.stroke();
        break;
      default:
        fill(); g.beginPath(); g.arc(0, 0, R * 0.5, 0, Math.PI * 2); g.fill();
    }
    g.shadowBlur = 0;
  }

  function drawRoulette(g: CanvasRenderingContext2D, R: number, angleRad: number, glow: number, accent: RGB): void {
    const wheelR = R * 0.82;
    const seg = (Math.PI * 2) / ROULETTE_SEGMENTS;

    for (let i = 0; i < ROULETTE_SEGMENTS; i++) {
      const a0 = angleRad + i * seg - Math.PI / 2 - seg / 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, wheelR, a0, a0 + seg);
      g.closePath();
      g.fillStyle = rouletteSegColor(i);
      g.fill();
      g.lineWidth = 0.6;
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.stroke();
    }

    g.shadowBlur = glow;
    g.shadowColor = rgba(accent, 0.9);
    g.lineWidth = Math.max(1, R * 0.08);
    g.strokeStyle = rgba(accent, 1);
    g.beginPath();
    g.arc(0, 0, wheelR, 0, Math.PI * 2);
    g.stroke();
    g.shadowBlur = 0;

    g.fillStyle = rgba(accent, 1);
    g.beginPath();
    g.arc(0, 0, Math.max(1, wheelR * 0.16), 0, Math.PI * 2);
    g.fill();

    const tipY = -wheelR + Math.max(1.5, R * 0.05);
    const baseY = -R;
    const pw = Math.max(2, R * 0.2);
    g.shadowBlur = glow;
    g.shadowColor = rgba(accent, 0.9);
    g.fillStyle = rgba(accent, 1);
    g.beginPath();
    g.moveTo(0, tipY);
    g.lineTo(-pw, baseY);
    g.lineTo(pw, baseY);
    g.closePath();
    g.fill();
    g.lineWidth = 0.8;
    g.strokeStyle = 'rgba(0,0,0,0.4)';
    g.stroke();
    g.shadowBlur = 0;
  }

  function drawCursorAt(x: number, y: number, alphaMul: number, idleAlpha: number): void {
    if (!settings) return;
    const cc = settings.cursor;
    const clickImpulse = Math.max(0, 1 - (timeMs - lastClickAt) / 200);
    const popScale = 1 + cc.clickScale * clickImpulse * 0.8;
    const pulseScale = 1 + cc.pulse * 0.25 * Math.sin((timeMs / 1000) * 6);
    const scale = popScale * pulseScale;

    const imgReady = !!(cursorImg && cursorImg.complete && cursorImg.naturalWidth > 0);

    if (cc.shape === 'roulette' && !imgReady) {
      ctx.save();
      ctx.globalAlpha = cc.opacity * idleAlpha * alphaMul;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      drawRoulette(ctx, cc.size / 2, (rouletteAngle * Math.PI) / 180, cc.glow * 22, resolve(cc.color, 0, 0));
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = cc.opacity * idleAlpha * alphaMul;
    ctx.translate(x, y);
    ctx.rotate(((cc.rotation + spinAngle) * Math.PI) / 180);
    ctx.scale(scale, scale);

    const ol = cc.outline;
    const outlined = !!(ol && ol.enabled && ol.width > 0);

    if (cursorImg && cursorImg.complete && cursorImg.naturalWidth > 0) {
      const h = cc.size;
      const w = (cursorImg.naturalWidth / cursorImg.naturalHeight) * h;
      const ox = -w * cc.hotspotX;
      const oy = -h * cc.hotspotY;
      if (outlined) {
        if (!cursorSilhouette || silhouetteColor !== ol.color) {
          cursorSilhouette = buildSilhouette(cursorImg, ol.color);
          silhouetteColor = ol.color;
        }
        for (let i = 0; i < OUTLINE_STAMPS; i++) {
          const a = (i / OUTLINE_STAMPS) * Math.PI * 2;
          ctx.drawImage(cursorSilhouette, ox + Math.cos(a) * ol.width, oy + Math.sin(a) * ol.width, w, h);
        }
      }
      if (cc.glow > 0) { ctx.shadowBlur = cc.glow * 20; ctx.shadowColor = 'rgba(168,85,247,0.6)'; }
      ctx.drawImage(cursorImg, ox, oy, w, h);
      ctx.shadowBlur = 0;
    } else {
      if (outlined) {
        const oc = hexToRgb(ol.color);
        for (let i = 0; i < OUTLINE_STAMPS; i++) {
          const a = (i / OUTLINE_STAMPS) * Math.PI * 2;
          ctx.save();
          ctx.translate(Math.cos(a) * ol.width, Math.sin(a) * ol.width);
          drawShape(ctx, cc.shape, oc, cc.size / 2, 0);
          ctx.restore();
        }
      }
      drawShape(ctx, cc.shape, resolve(cc.color, 0, 0), cc.size / 2, cc.glow * 22);
    }
    ctx.restore();
  }

  function renderCursor(px = 32): string | null {
    if (!settings) return null;
    const cc = settings.cursor;
    const off = document.createElement('canvas');
    off.width = px; off.height = px;
    const g = off.getContext('2d');
    if (!g) return null;
    const cx = px / 2, cy = px / 2;
    const ol = cc.outline;
    const outlined = !!(ol && ol.enabled && ol.width > 0);
    const ow = outlined ? ol.width : 0;

    g.globalAlpha = Math.max(0.15, cc.opacity);

    if (cursorImg && cursorImg.complete && cursorImg.naturalWidth > 0) {
      const w0 = cursorImg.naturalWidth, h0 = cursorImg.naturalHeight;
      const hx = cc.hotspotX * w0, hy = cc.hotspotY * h0;
      const maxHalf = Math.max(hx, w0 - hx, hy, h0 - hy) || 1;
      const scale = (px / 2 - ow - 1) / maxHalf;
      const w = w0 * scale, h = h0 * scale;
      const dx = cx - hx * scale, dy = cy - hy * scale;
      if (outlined) {
        const sil = buildSilhouette(cursorImg, ol.color);
        for (let i = 0; i < OUTLINE_STAMPS; i++) {
          const a = (i / OUTLINE_STAMPS) * Math.PI * 2;
          g.drawImage(sil, dx + Math.cos(a) * ol.width, dy + Math.sin(a) * ol.width, w, h);
        }
      }
      g.drawImage(cursorImg, dx, dy, w, h);
    } else {
      const R = px / 2 - ow - 1;
      g.save();
      g.translate(cx, cy);
      if (cc.shape === 'roulette') {
        drawRoulette(g, R, (rouletteAngle * Math.PI) / 180, 0, resolve(cc.color, 0, 0));
      } else {
        if (outlined) {
          const oc = hexToRgb(ol.color);
          for (let i = 0; i < OUTLINE_STAMPS; i++) {
            const a = (i / OUTLINE_STAMPS) * Math.PI * 2;
            g.save();
            g.translate(Math.cos(a) * ol.width, Math.sin(a) * ol.width);
            drawShape(g, cc.shape, oc, R, 0);
            g.restore();
          }
        }
        drawShape(g, cc.shape, resolve(cc.color, 0, 0), R, 0);
      }
      g.restore();
    }
    try { return off.toDataURL('image/png'); } catch { return null; }
  }

  function updateGhosts(): void {
    if (!settings) return;
    const gc = settings.cursor.ghost;
    if (!gc || !gc.enabled || gc.count < 1 || smooth.x < 0) { ghosts = []; return; }
    const n = Math.max(1, Math.min(12, Math.round(gc.count)));
    if (ghosts.length !== n) ghosts = Array.from({ length: n }, () => ({ x: smooth.x, y: smooth.y }));
    const follow = 0.06 + (1 - Math.max(0, Math.min(1, gc.delay))) * 0.44;
    let lx = smooth.x, ly = smooth.y;
    for (const g of ghosts) {
      g.x += (lx - g.x) * follow;
      g.y += (ly - g.y) * follow;
      lx = g.x; ly = g.y;
    }
  }

  function drawCursor(idleAlpha: number): void {
    if (!settings) return;
    const gc = settings.cursor.ghost;
    if (gc && gc.enabled && ghosts.length) {
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const fade = gc.opacity * ((ghosts.length - i) / (ghosts.length + 1));
        if (fade > 0.01) drawCursorAt(ghosts[i].x, ghosts[i].y, fade, idleAlpha);
      }
    }
    drawCursorAt(smooth.x, smooth.y, 1, idleAlpha);
  }

  function frame(): void {
    raf = requestAnimationFrame(frame);
    const t = now();
    const dt = Math.min(64, t - lastFrame);
    lastFrame = t;
    timeMs = t;
    if (!settings || !active) { ctx.clearRect(0, 0, cssW, cssH); return; }
    rainbowSpeed = settings.behavior.rainbowSpeed;
    spinAngle += (settings.cursor.spin * dt) / 1000;

    if (settings.cursor.shape === 'roulette') {
      const segDeg = 360 / ROULETTE_SEGMENTS;
      if (Math.abs(rouletteVel) > 30) {
        rouletteAngle += (rouletteVel * dt) / 1000;
        rouletteVel *= Math.pow(ROULETTE_FRICTION, dt / 16.667);
        rouletteTarget = null;
      } else if (rouletteVel !== 0 || rouletteTarget !== null) {
        if (rouletteTarget === null) rouletteTarget = Math.round(rouletteAngle / segDeg) * segDeg;
        rouletteVel = 0;
        rouletteAngle += (rouletteTarget - rouletteAngle) * Math.min(1, dt / 90);
        if (Math.abs(rouletteTarget - rouletteAngle) < 0.15) { rouletteAngle = rouletteTarget; rouletteTarget = null; }
      }
    }

    ctx.clearRect(0, 0, cssW, cssH);

    if (target.x >= 0) {
      const lerp = 0.05 + Math.pow(1 - settings.cursor.smoothing, 2) * 0.95;
      const nx = smooth.x + (target.x - smooth.x) * lerp;
      const ny = smooth.y + (target.y - smooth.y) * lerp;
      velocity = velocity * 0.7 + Math.hypot(nx - smooth.x, ny - smooth.y) * 0.3;
      smooth.x = nx; smooth.y = ny;

      if (settings.trail.enabled) {
        const head = trail[trail.length - 1];
        if (!head || Math.hypot(head.x - nx, head.y - ny) > Math.max(0.5, settings.trail.spacing)) {
          trail.push({ x: nx, y: ny, born: t, vel: velocity });
          const cap = Math.max(4, settings.trail.length);
          if (trail.length > cap) trail = trail.slice(trail.length - cap);
        }
      }
    }

    let idleAlpha = 1;
    if (settings.behavior.hideOnIdle) {
      const idleFor = t - lastMoveAt - settings.behavior.idleSeconds * 1000;
      if (idleFor > 0) idleAlpha = Math.max(0, 1 - idleFor / 400);
    }

    if (settings.trail.enabled && idleAlpha > 0) {
      const life = 1200 * (1 - settings.trail.fade) + 120;
      ctx.save();
      ctx.globalAlpha = idleAlpha;
      drawTrail(settings.trail, life);
      ctx.restore();
    } else if (!settings.trail.enabled) {
      trail = [];
    }

    drawBursts();
    updateGhosts();
    if (smooth.x >= 0) drawCursor(idleAlpha);
  }

  return {
    setSettings: (s) => { settings = s; },
    setCursorImage: (img) => { cursorImg = img; cursorSilhouette = null; silhouetteColor = ''; },
    renderCursor,
    setPointer,
    emitClick,
    setActive: (a) => {
      if (a && !active) {
        target.x = -1; target.y = -1; smooth.x = -1; smooth.y = -1;
        trail = []; ghosts = []; bursts = [];
        rouletteVel = 0; rouletteTarget = null;
      }
      active = a;
    },
    resize,
    start: () => { if (!raf) { resize(); lastFrame = now(); raf = requestAnimationFrame(frame); } },
    stop: () => { if (raf) cancelAnimationFrame(raf); raf = 0; },
  };
}
