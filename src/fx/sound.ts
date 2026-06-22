import type { SoundConfig } from '../../shared/types';

export interface SoundPlayer {
  setConfig(c: SoundConfig): void;
  play(): void;
}

declare global {
  interface Window {
    krypt: import('../../shared/types').KryptBridge;
  }
}

export function createSoundPlayer(variant: 'click' | 'key' = 'click'): SoundPlayer {
  let config: SoundConfig = { enabled: false, soundId: null, volume: 0.5, pitchJitter: 0 };
  let loadedId: string | null = null;
  let buffer: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;

  const jitter = (): number => 1 + (Math.random() - 0.5) * 2 * config.pitchJitter * 0.5;

  async function ensureLoaded(): Promise<void> {
    if (!config.soundId) {
      buffer = null;
      loadedId = null;
      return;
    }
    if (config.soundId === loadedId && buffer) return;
    try {
      const res = await window.krypt.assets.dataUrl(config.soundId);
      if (res.ok && res.data) {
        buffer = new Audio(res.data);
        loadedId = config.soundId;
      } else {
        buffer = null;
        loadedId = null;
      }
    } catch {
      buffer = null;
      loadedId = null;
    }
  }

  function ctx(): AudioContext {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  }

  function synthClick(): void {
    try {
      const ac = ctx();
      const t = ac.currentTime;
      const j = jitter();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880 * j, t);
      osc.frequency.exponentialRampToValueAtTime(220 * j, t + 0.05);
      gain.gain.setValueAtTime(Math.max(0.0001, config.volume * 0.25), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch {
    }
  }

  function synthKey(): void {
    try {
      const ac = ctx();
      const t = ac.currentTime;
      const len = Math.floor(ac.sampleRate * 0.03);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400 * jitter();
      const gain = ac.createGain();
      gain.gain.setValueAtTime(Math.max(0.0001, config.volume * 0.5), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(hp).connect(gain).connect(ac.destination);
      src.start(t);
      src.stop(t + 0.05);
    } catch {
    }
  }

  return {
    setConfig: (c) => {
      config = c;
      void ensureLoaded();
    },
    play: () => {
      if (!config.enabled) return;
      if (buffer) {
        const a = buffer.cloneNode(true) as HTMLAudioElement;
        a.volume = Math.max(0, Math.min(1, config.volume));
        a.playbackRate = Math.max(0.25, jitter());
        void a.play().catch(() => undefined);
      } else if (variant === 'key') {
        synthKey();
      } else {
        synthClick();
      }
    },
  };
}
