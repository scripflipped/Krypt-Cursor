import { useEffect, useRef } from 'react';
import { createEngine, type FxEngine } from '../fx/engine';
import { createSoundPlayer, type SoundPlayer } from '../fx/sound';
import { useApp } from '../state/AppStateProvider';

export function PreviewStage({ height = 240, withSound = false }: { height?: number; withSound?: boolean }) {
  const { settings } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FxEngine | null>(null);
  const soundRef = useRef<SoundPlayer | null>(null);
  const lastCursorId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = createEngine(canvas);
    engineRef.current = engine;
    soundRef.current = createSoundPlayer();
    engine.start();
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!settings || !engineRef.current) return;
    engineRef.current.setSettings(settings);
    soundRef.current?.setConfig(settings.sound);
    if (settings.cursor.imageId !== lastCursorId.current) {
      lastCursorId.current = settings.cursor.imageId;
      const id = settings.cursor.imageId;
      if (!id) {
        engineRef.current.setCursorImage(null);
      } else {
        window.krypt.assets.dataUrl(id).then((res) => {
          if (res.ok && res.data) {
            const img = new Image();
            img.onload = () => engineRef.current?.setCursorImage(img);
            img.src = res.data;
          }
        });
      }
    }
  }, [settings]);

  const toLocal = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-krypt-radial"
      style={{ height, cursor: 'none', background: 'radial-gradient(700px circle at 30% 0%, rgba(168,85,247,0.14), #0b0b12 60%)' }}
      onMouseMove={(e) => {
        const p = toLocal(e);
        engineRef.current?.setPointer(p.x, p.y);
      }}
      onMouseDown={(e) => {
        const p = toLocal(e);
        engineRef.current?.emitClick(p.x, p.y, e.button + 1);
        if (withSound) soundRef.current?.play();
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-krypt-muted">
        Move &amp; click here to preview
      </div>
    </div>
  );
}
