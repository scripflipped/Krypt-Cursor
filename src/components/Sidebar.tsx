import { MousePointer2, Sparkles, MousePointerClick, Volume2, Wand2, Info, Globe, MessageCircle } from 'lucide-react';
import { cls } from '../utils/format';
import { useApp } from '../state/AppStateProvider';

export type Route = 'cursor' | 'trails' | 'clicks' | 'sounds' | 'presets' | 'about';

const NAV: { id: Route; label: string; icon: typeof MousePointer2 }[] = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2 },
  { id: 'trails', label: 'Trails', icon: Sparkles },
  { id: 'clicks', label: 'Click Effects', icon: MousePointerClick },
  { id: 'sounds', label: 'Sounds', icon: Volume2 },
  { id: 'presets', label: 'Presets', icon: Wand2 },
  { id: 'about', label: 'About', icon: Info },
];

export function Sidebar({ current, onNavigate }: { current: Route; onNavigate: (r: Route) => void }) {
  const { settings, meta } = useApp();
  const active = settings?.enabled ?? false;
  const links = meta?.links;

  const open = (url?: string) => url && window.krypt.app.openExternal(url);

  return (
    <aside className="flex w-[220px] flex-col border-r border-white/5 bg-krypt-void/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <img
          src="./krypt.png"
          alt=""
          className="h-9 w-9 rounded-md drop-shadow-[0_0_6px_rgba(168,85,247,0.55)]"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
        />
        <div className="leading-tight">
          <div className="text-lg font-bold">
            <span className="text-krypt-gradient">Krypt</span> <span className="text-white">Cursor</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-krypt-muted">Custom Cursor</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = current === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cls(
                'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'border border-white/10 bg-white/10 text-white'
                  : 'border border-transparent text-krypt-muted hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className={cls('h-4 w-4', isActive && 'text-krypt-purple')} />
              {label}
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-krypt-gradient" />}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 px-4 pb-5">
        <div className="flex items-center gap-2 text-xs text-krypt-muted">
          <span
            className={cls(
              'h-2 w-2 rounded-full',
              active ? 'bg-emerald-400 glow-playing animate-pulse-slow' : 'bg-white/30',
            )}
          />
          {active ? 'Effects active' : 'Paused'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => open(links?.site || 'https://krypt.cc')}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-krypt-muted transition hover:border-white/20 hover:text-white"
          >
            <Globe className="h-3.5 w-3.5" /> krypt.cc
          </button>
          <button
            onClick={() => open(links?.discord || 'https://discord.gg/muzFKR657F')}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-krypt-muted transition hover:border-white/20 hover:text-white"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Discord
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-krypt-muted">Free &amp; open source · no ads, no telemetry</p>
      </div>
    </aside>
  );
}
