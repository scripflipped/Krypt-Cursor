import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cls, clamp } from '../utils/format';

export function Page({ title, subtitle, actions, children }: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col animate-fade-in">
      <header className="flex items-start justify-between px-8 pt-7 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-krypt-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="flex-1 overflow-auto px-8 pb-8">{children}</div>
    </div>
  );
}

export function Section({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      {eyebrow && (
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-krypt-muted">{eyebrow}</div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className, hoverable }: { children: ReactNode; className?: string; hoverable?: boolean }) {
  return (
    <div
      className={cls(
        'rounded-2xl border border-white/10 bg-krypt-panel/80 backdrop-blur-sm shadow-krypt-card p-5',
        hoverable && 'transition hover:border-white/20 hover:shadow-krypt-glow',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, className }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cls(
        'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-krypt-glow bg-krypt-gradient',
        'transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, destructive, disabled, className }: {
  children: ReactNode; onClick?: () => void; destructive?: boolean; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cls(
        'rounded-xl border px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        destructive
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 hover:border-rose-500/50'
          : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/20',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, onClick, active, title, className }: {
  children: ReactNode; onClick?: () => void; active?: boolean; title?: string; className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cls(
        'flex h-9 w-9 items-center justify-center rounded-lg border transition',
        active
          ? 'border-krypt-purple/50 bg-krypt-purple/15 text-white shadow-krypt-glow'
          : 'border-white/10 bg-white/5 text-krypt-muted hover:text-white hover:border-white/20',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cls(
        'relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40',
        checked ? 'bg-krypt-gradient shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-white/10',
      )}
    >
      <span
        className={cls(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-sm text-white/90">{label}</div>
        {hint && <div className="text-xs text-krypt-muted">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

export function Divider() {
  return <div className="my-1 h-px bg-white/5" />;
}

export function Slider({ value, min, max, step = 1, onChange, suffix }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string;
}) {
  const fill = ((value - min) / (max - min || 1)) * 100;
  return (
    <div className="flex w-56 items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-krypt-purple"
        style={{ backgroundImage: `linear-gradient(90deg,#6366F1,#A855F7 ${fill}%,rgba(255,255,255,0.1) ${fill}%)` }}
      />
      <span className="w-12 text-right font-mono text-xs text-krypt-muted">
        {Number.isInteger(step) ? value : value.toFixed(2)}
        {suffix}
      </span>
    </div>
  );
}

export function NumberInput({ value, min, max, step = 1, onChange }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  const [buf, setBuf] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setBuf(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={buf}
      onFocus={() => (focused.current = true)}
      onChange={(e) => {
        setBuf(e.target.value);
        const n = parseFloat(e.target.value);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        focused.current = false;
        const n = clamp(parseFloat(buf) || min, min, max);
        onChange(n);
        setBuf(String(n));
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-20 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-right font-mono text-sm text-white outline-none focus:border-krypt-purple/50"
      style={{ MozAppearance: 'textfield' }}
      data-step={step}
    />
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cls(
            'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition',
            value === o.value ? 'bg-krypt-gradient text-white shadow-krypt-glow' : 'text-krypt-muted hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Choices<T extends string>({ value, options, onChange, columns = 4 }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; columns?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cls(
            'rounded-xl border px-2 py-2 text-xs font-medium capitalize transition',
            value === o.value
              ? 'border-krypt-purple/60 bg-krypt-purple/15 text-white shadow-krypt-glow'
              : 'border-white/10 bg-white/5 text-krypt-muted hover:text-white hover:border-white/20',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className={cls('flex items-center gap-2', disabled && 'opacity-40 pointer-events-none')}>
      <span
        className="h-7 w-7 rounded-lg border border-white/15"
        style={{ background: value, boxShadow: `0 0 12px ${value}55` }}
      />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
      />
    </label>
  );
}

export function Badge({ children, tone = 'neutral' }: {
  children: ReactNode; tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'gradient';
}) {
  const tones: Record<string, string> = {
    neutral: 'border-white/15 text-krypt-muted',
    success: 'border-emerald-500/30 text-emerald-300',
    warn: 'border-amber-500/30 text-amber-300',
    danger: 'border-rose-500/30 text-rose-300',
    gradient: 'border-transparent text-white bg-krypt-gradient',
  };
  return (
    <span className={cls('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', tones[tone])}>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-krypt-muted">
      {children}
    </kbd>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 py-12 text-center text-sm text-krypt-muted">
      {children}
    </div>
  );
}
