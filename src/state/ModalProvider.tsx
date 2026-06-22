import { createContext, useContext, useState, type ReactNode } from 'react';
import { PrimaryButton, GhostButton } from '../components/common';

interface ConfirmReq {
  kind: 'confirm';
  title: string;
  body: string;
  confirmLabel: string;
  destructive: boolean;
  resolve: (v: boolean) => void;
}
interface PromptReq {
  kind: 'prompt';
  title: string;
  body: string;
  value: string;
  resolve: (v: string | null) => void;
}
type Req = ConfirmReq | PromptReq;

interface ModalApi {
  confirm: (opts: { title: string; body: string; confirmLabel?: string; destructive?: boolean }) => Promise<boolean>;
  prompt: (opts: { title: string; body: string; value?: string }) => Promise<string | null>;
}

const Ctx = createContext<ModalApi | null>(null);

export function useConfirm() {
  return useContext(Ctx)!.confirm;
}
export function usePrompt() {
  return useContext(Ctx)!.prompt;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Req[]>([]);
  const [draft, setDraft] = useState('');
  const top = queue[0];

  const api: ModalApi = {
    confirm: (opts) =>
      new Promise((resolve) =>
        setQueue((q) => [
          ...q,
          { kind: 'confirm', title: opts.title, body: opts.body, confirmLabel: opts.confirmLabel ?? 'Confirm', destructive: !!opts.destructive, resolve },
        ]),
      ),
    prompt: (opts) =>
      new Promise((resolve) => {
        setDraft(opts.value ?? '');
        setQueue((q) => [...q, { kind: 'prompt', title: opts.title, body: opts.body, value: opts.value ?? '', resolve }]);
      }),
  };

  function close(payload: boolean | string | null) {
    if (!top) return;
    if (top.kind === 'confirm') top.resolve(payload as boolean);
    else top.resolve(payload as string | null);
    setQueue((q) => q.slice(1));
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      {top && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-[420px] rounded-2xl border border-white/10 bg-krypt-surface p-6 shadow-krypt-card animate-pop-in">
            <h2 className="text-lg font-semibold">{top.title}</h2>
            <p className="mt-2 text-sm text-krypt-muted">{top.body}</p>
            {top.kind === 'prompt' && (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && close(draft)}
                className="mt-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-krypt-purple/50"
              />
            )}
            <div className="mt-6 flex justify-end gap-2">
              <GhostButton onClick={() => close(top.kind === 'confirm' ? false : null)}>Cancel</GhostButton>
              {top.kind === 'confirm' ? (
                top.destructive ? (
                  <GhostButton destructive onClick={() => close(true)}>{top.confirmLabel}</GhostButton>
                ) : (
                  <PrimaryButton onClick={() => close(true)}>{top.confirmLabel}</PrimaryButton>
                )
              ) : (
                <PrimaryButton onClick={() => close(draft)}>Save</PrimaryButton>
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
