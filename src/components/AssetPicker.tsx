import { useCallback, useEffect, useState } from 'react';
import { Upload, Trash2, Play, Check } from 'lucide-react';
import type { AssetKind, AssetMeta } from '../../shared/types';
import { cls } from '../utils/format';
import { useToast } from '../state/ToastProvider';
import { useConfirm } from '../state/ModalProvider';
import { GhostButton, Empty } from './common';

export function AssetPicker({ kind, selectedId, onSelect, noneLabel }: {
  kind: AssetKind;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  noneLabel: string;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<AssetMeta[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const res = await window.krypt.assets.list(kind);
    if (res.ok && res.data) {
      setItems(res.data);
      if (kind === 'cursor') {
        const next: Record<string, string> = {};
        await Promise.all(
          res.data.map(async (a) => {
            const d = await window.krypt.assets.dataUrl(a.id);
            if (d.ok && d.data) next[a.id] = d.data;
          }),
        );
        setThumbs(next);
      }
    } else if (!res.ok) {
      toast.error(res.message);
    }
  }, [kind, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onImport = async () => {
    const res = await window.krypt.assets.import(kind);
    if (res.ok && res.data) {
      toast.success(res.message);
      await refresh();
      onSelect(res.data.id);
    } else if (!res.message.includes('cancel')) {
      toast.error(res.message);
    }
  };

  const onRemove = async (a: AssetMeta) => {
    if (!(await confirm({ title: `Remove ${a.name}?`, body: 'This deletes the imported file.', confirmLabel: 'Remove', destructive: true }))) return;
    const res = await window.krypt.assets.remove(a.id);
    if (res.ok) {
      toast.success('Removed.');
      if (selectedId === a.id) onSelect(null);
      await refresh();
    } else {
      toast.error(res.message);
    }
  };

  const preview = async (a: AssetMeta) => {
    const d = await window.krypt.assets.dataUrl(a.id);
    if (d.ok && d.data) void new Audio(d.data).play().catch(() => undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onSelect(null)}
          className={cls(
            'rounded-lg border px-3 py-1.5 text-xs transition',
            selectedId === null ? 'border-krypt-purple/50 bg-krypt-purple/15 text-white' : 'border-white/10 bg-white/5 text-krypt-muted hover:text-white',
          )}
        >
          {noneLabel}
        </button>
        <GhostButton onClick={onImport}>
          <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload {kind}</span>
        </GhostButton>
      </div>

      {items.length === 0 ? (
        <Empty>No custom {kind}s yet — upload one above.</Empty>
      ) : kind === 'cursor' ? (
        <div className="grid grid-cols-5 gap-2">
          {items.map((a) => (
            <div
              key={a.id}
              className={cls(
                'group relative flex aspect-square items-center justify-center rounded-xl border bg-black/30 p-2 transition',
                selectedId === a.id ? 'border-krypt-purple/60 shadow-krypt-glow' : 'border-white/10 hover:border-white/25',
              )}
            >
              <button onClick={() => onSelect(a.id)} className="flex h-full w-full items-center justify-center" title={a.name}>
                {thumbs[a.id] ? (
                  <img src={thumbs[a.id]} alt={a.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-krypt-muted">{a.name}</span>
                )}
              </button>
              {selectedId === a.id && (
                <span className="absolute left-1 top-1 rounded-full bg-krypt-gradient p-0.5">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
              <button
                onClick={() => onRemove(a)}
                className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-krypt-muted opacity-0 transition hover:text-rose-300 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((a) => (
            <div
              key={a.id}
              className={cls(
                'flex items-center gap-2 rounded-xl border px-3 py-2 transition',
                selectedId === a.id ? 'border-krypt-purple/60 bg-krypt-purple/10' : 'border-white/10 bg-white/5 hover:border-white/25',
              )}
            >
              <button onClick={() => onSelect(a.id)} className="flex flex-1 items-center gap-2 text-left text-sm">
                {selectedId === a.id && <Check className="h-3.5 w-3.5 text-krypt-purple" />}
                <span className="truncate">{a.name}{a.ext}</span>
              </button>
              <button onClick={() => preview(a)} className="rounded-md p-1 text-krypt-muted hover:text-white" title="Play">
                <Play className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onRemove(a)} className="rounded-md p-1 text-krypt-muted hover:text-rose-300" title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
