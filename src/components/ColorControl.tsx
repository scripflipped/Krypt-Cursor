import { Sparkles } from 'lucide-react';
import type { ColorConfig, ColorMode } from '../../shared/types';
import { Row, Segmented, ColorInput } from './common';

const MODES: { value: ColorMode; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'velocity', label: 'Speed' },
];

export function ColorControl({ value, onChange }: { value: ColorConfig; onChange: (c: ColorConfig) => void }) {
  const two = value.mode === 'gradient' || value.mode === 'velocity';
  return (
    <>
      <Row label="Color mode">
        <Segmented value={value.mode} options={MODES} onChange={(mode) => onChange({ ...value, mode })} />
      </Row>
      <Row
        label={value.mode === 'rainbow' ? 'Rainbow' : two ? (value.mode === 'velocity' ? 'Slow → Fast' : 'From → To') : 'Color'}
        hint={value.mode === 'rainbow' ? 'Cycles hue (speed on the Presets page)' : value.mode === 'velocity' ? 'Color shifts with cursor speed' : undefined}
      >
        {value.mode === 'rainbow' ? (
          <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-krypt-muted">
            <Sparkles className="h-3.5 w-3.5 text-krypt-purple" /> auto
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <ColorInput value={value.a} onChange={(a) => onChange({ ...value, a })} />
            {two && (
              <>
                <span className="text-krypt-muted">→</span>
                <ColorInput value={value.b} onChange={(b) => onChange({ ...value, b })} />
              </>
            )}
            <button
              onClick={() => onChange({ mode: 'gradient', a: '#6366F1', b: '#EC4899' })}
              className="ml-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-krypt-muted hover:text-white hover:border-white/20"
              title="Use the Krypt gradient"
            >
              Krypt
            </button>
          </div>
        )}
      </Row>
    </>
  );
}
