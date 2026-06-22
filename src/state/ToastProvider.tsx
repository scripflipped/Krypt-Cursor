import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cls } from '../utils/format';

type Level = 'success' | 'warn' | 'error' | 'info';
interface Toast { id: number; level: Level; message: string }

interface ToastApi {
  success: (m: string) => void;
  warn: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast outside provider');
  return v;
}

const ICONS = {
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
  info: Info,
};
const TONE = {
  success: 'border-emerald-500/30 text-emerald-300',
  warn: 'border-amber-500/30 text-amber-300',
  error: 'border-rose-500/30 text-rose-300',
  info: 'border-indigo-500/30 text-indigo-200',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((level: Level, message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, level, message }]);
    setTimeout(() => dismiss(id), level === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const api: ToastApi = {
    success: (m) => push('success', m),
    warn: (m) => push('warn', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.level];
          return (
            <div
              key={t.id}
              className={cls(
                'pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-krypt-surface/95 p-3 shadow-krypt-card backdrop-blur-sm animate-pop-in',
                TONE[t.level],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 text-sm text-white/90">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-krypt-muted hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
