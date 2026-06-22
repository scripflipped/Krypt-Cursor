import { Power, EyeOff, RotateCcw } from 'lucide-react';
import { cls } from '../utils/format';
import { useApp } from '../state/AppStateProvider';
import { useConfirm } from '../state/ModalProvider';
import { GhostButton } from './common';

export function TopBar() {
  const { settings, update, reset } = useApp();
  const confirm = useConfirm();
  if (!settings) return <div className="h-[57px] border-b border-white/5" />;

  const onReset = async () => {
    if (await confirm({ title: 'Reset all settings?', body: 'This restores every cursor, trail, click and sound option to defaults.', confirmLabel: 'Reset', destructive: true })) {
      void reset();
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-white/5 bg-krypt-void/60 px-6 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button
          onClick={() => update({ enabled: !settings.enabled })}
          className={cls(
            'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition',
            settings.enabled
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 glow-playing'
              : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10',
          )}
        >
          <Power className="h-4 w-4" />
          {settings.enabled ? 'Effects On' : 'Effects Off'}
        </button>

        <button
          onClick={() => update({ hideSystemCursor: !settings.hideSystemCursor })}
          className={cls(
            'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition',
            settings.hideSystemCursor
              ? 'border-krypt-purple/50 bg-krypt-purple/15 text-white shadow-krypt-glow'
              : 'border-white/10 bg-white/5 text-krypt-muted hover:text-white hover:bg-white/10',
          )}
        >
          <EyeOff className="h-4 w-4" />
          Hide system cursor
        </button>
      </div>

      <GhostButton onClick={onReset}>
        <span className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </span>
      </GhostButton>
    </div>
  );
}
