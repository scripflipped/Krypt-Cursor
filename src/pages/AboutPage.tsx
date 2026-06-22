import { Globe, MessageCircle, Github, ExternalLink, User } from 'lucide-react';
import { Page, Section, Card, Badge } from '../components/common';
import { useApp } from '../state/AppStateProvider';

const cleanUsername = (raw: string) => raw.replace(/[^A-Za-z0-9_.~-]/g, '').slice(0, 32);

const OTHER_TOOLS = [
  { name: 'Krypt Macro', desc: 'Clean, reliable auto-clicker & macro recorder.', url: 'https://krypt.cc/tools/macro' },
  { name: 'Krypt Crosshair', desc: 'Overlay crosshair with a preset library.', url: 'https://krypt.cc/tools/crosshair' },
  { name: 'Krypt Cleaner', desc: 'Free PC cleaner — temp files, caches, logs.', url: 'https://krypt.cc/tools/cleaner' },
  { name: 'Krypt Tweaker', desc: 'Reversible PC optimizer & debloater.', url: 'https://krypt.cc/tools/tweaker' },
];

export function AboutPage() {
  const { meta, settings, update } = useApp();
  const open = (url: string) => window.krypt.app.openExternal(url);
  const username = settings?.kryptUsername ?? '';

  return (
    <Page title="About">
      <Section>
        <Card>
          <div className="flex items-center gap-4">
            <img
              src="./krypt.png"
              alt=""
              className="h-14 w-14 rounded-xl drop-shadow-[0_0_6px_rgba(168,85,247,0.55)]"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
            <div>
              <div className="text-2xl font-bold">
                <span className="text-krypt-gradient">Krypt</span> Cursor
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-krypt-muted">
                <span className="font-mono">v{meta?.version ?? '1.0.0'}</span>
                <Badge tone="gradient">MIT</Badge>
                {meta && meta.trust !== 'CLEAN' && <Badge tone="warn">Limited mode</Badge>}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-krypt-muted">Custom cursor, trails, click effects and click sounds. Free. No ads. No telemetry. No bullshit.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkBtn onClick={() => open('https://krypt.cc/tools/cursor')} icon={<Globe className="h-4 w-4" />}>krypt.cc</LinkBtn>
            <LinkBtn onClick={() => open('https://discord.gg/muzFKR657F')} icon={<MessageCircle className="h-4 w-4" />}>Discord</LinkBtn>
            <LinkBtn onClick={() => open('https://github.com/scripflipped/Krypt-Cursor')} icon={<Github className="h-4 w-4" />}>GitHub</LinkBtn>
          </div>
        </Card>
      </Section>

      <Section eyebrow="Krypt Profile">
        <Card>
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <User className="h-4 w-4 text-krypt-purple" /> Show your Krypt profile on Discord
          </div>
          <p className="mt-1 text-xs text-krypt-muted">
            Enter your Krypt username and the top button of your Discord Rich Presence becomes{' '}
            <span className="text-white/80">Krypt Profile</span>, linking to your bio.
          </p>
          <div className="mt-3 flex items-center overflow-hidden rounded-lg border border-white/10 bg-black/40 focus-within:border-krypt-purple/50">
            <span className="select-none border-r border-white/10 px-3 py-2 font-mono text-sm text-krypt-muted">krypt.cc/</span>
            <input
              value={username}
              onChange={(e) => update({ kryptUsername: cleanUsername(e.target.value) })}
              placeholder="yourname"
              spellCheck={false}
              autoCapitalize="none"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-krypt-muted/50"
            />
            {username && (
              <button
                onClick={() => update({ kryptUsername: '' })}
                className="select-none px-3 py-2 text-xs text-krypt-muted transition hover:text-rose-300"
              >
                Clear
              </button>
            )}
          </div>
          {username ? (
            <p className="mt-2 text-xs text-krypt-muted">
              Profile button links to{' '}
              <button onClick={() => open(`https://krypt.cc/${username}`)} className="text-krypt-purple hover:underline">
                krypt.cc/{username}
              </button>
            </p>
          ) : (
            <p className="mt-2 text-xs text-krypt-muted">No username set — the top button stays “Free Tools”.</p>
          )}
        </Card>
      </Section>

      <Section eyebrow="Other Krypt tools">
        <div className="grid grid-cols-2 gap-3">
          {OTHER_TOOLS.map((tool) => (
            <Card key={tool.name} hoverable className="cursor-pointer" >
              <button onClick={() => open(tool.url)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{tool.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-krypt-muted" />
                </div>
                <p className="mt-1 text-xs text-krypt-muted">{tool.desc}</p>
              </button>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <p className="text-center text-xs text-krypt-muted">
          When this tool runs, your Discord shows <span className="text-white/80">Using Krypt Cursor</span> — that's how Krypt stays free.
        </p>
      </Section>
    </Page>
  );
}

function LinkBtn({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/10"
    >
      {icon}
      {children}
    </button>
  );
}
