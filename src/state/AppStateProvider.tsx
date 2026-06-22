import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppMeta, Settings } from '../../shared/types';
import { useToast } from './ToastProvider';

interface AppState {
  settings: Settings | null;
  meta: AppMeta | null;
  update: (patch: Partial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [meta, setMeta] = useState<AppMeta | null>(null);

  useEffect(() => {
    window.krypt.settings.get().then(setSettings);
    window.krypt.app.meta().then(setMeta);
    const offChanged = window.krypt.settings.onChanged(setSettings);
    const showNotice = (n: { level: 'info' | 'warn' | 'error'; message: string }) => {
      if (n.level === 'error') toast.error(n.message);
      else if (n.level === 'warn') toast.warn(n.message);
      else toast.info(n.message);
    };
    const offNotice = window.krypt.app.onNotice(showNotice);
    window.krypt.app.takeNotices().then((ns) => ns.forEach(showNotice));
    return () => {
      offChanged();
      offNotice();
    };
  }, [toast]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      setSettings((s) => (s ? { ...s, ...patch } : s));
      const res = await window.krypt.settings.update(patch);
      if (!res.ok) toast.error(res.message);
    },
    [toast],
  );

  const reset = useCallback(async () => {
    const res = await window.krypt.settings.reset();
    if (res.ok && res.data) {
      setSettings(res.data);
      toast.success('Restored defaults.');
    } else {
      toast.error(res.message);
    }
  }, [toast]);

  return <Ctx.Provider value={{ settings, meta, update, reset }}>{children}</Ctx.Provider>;
}
