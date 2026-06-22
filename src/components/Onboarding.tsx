import { useState, type ComponentType } from 'react';
import {
  Sparkles, MousePointer2, MousePointerClick, Volume2, Wand2,
  Power, MessageCircle, Twitter, Globe, ArrowLeft, ArrowRight, Check, X,
} from 'lucide-react';
import { cls } from '../utils/format';
import { useApp } from '../state/AppStateProvider';
import { PrimaryButton, GhostButton, Switch, Kbd } from './common';

const DISCORD_URL = 'https://discord.gg/muzFKR657F';
const X_URL = 'https://x.com/yuhgoslavia';
const SITE_URL = 'https://krypt.cc';

interface Step {
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  render: (open: (url: string) => void) => React.ReactNode;
}

const FEATURES: { icon: ComponentType<{ className?: string }>; label: string; desc: string }[] = [
  { icon: MousePointer2, label: 'Custom cursor', desc: 'Your own image or a built-in glow shape.' },
  { icon: Sparkles, label: 'Motion trails', desc: 'Comet, neon, ribbon, dots and more.' },
  { icon: MousePointerClick, label: 'Click effects', desc: 'Rings, bursts, confetti, hearts…' },
  { icon: Volume2, label: 'Click & key sounds', desc: 'Satisfying clicks on every press.' },
];

const STEPS: Step[] = [
  {
    icon: Sparkles,
    eyebrow: 'Welcome',
    title: 'Give your cursor a glow-up',
    render: () => (
      <p className="text-sm leading-relaxed text-krypt-muted">
        <span className="text-white/90">Krypt Cursor</span> draws a custom cursor, glowing motion
        trails, click bursts and click sounds on a transparent overlay on top of everything —
        perfect for streams, tutorials and just making your desktop feel alive.
        <br />
        <br />
        It&apos;s <span className="text-white/90">100% free</span> — no ads, no telemetry, no nonsense.
        Let&apos;s take ten seconds to show you around.
      </p>
    ),
  },
  {
    icon: Wand2,
    eyebrow: 'What you can do',
    title: 'Everything is customizable',
    render: () => (
      <div className="grid grid-cols-2 gap-3">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-krypt-gradient shadow-krypt-glow">
                <Icon className="h-4 w-4 text-white" />
              </span>
              <span className="text-sm font-semibold text-white/90">{label}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-krypt-muted">{desc}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Power,
    eyebrow: 'Good to know',
    title: 'Two things worth remembering',
    render: () => (
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <Power className="h-4 w-4 text-emerald-300" /> Toggle effects anytime
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-krypt-muted">
            Use the <span className="text-white/90">Effects On/Off</span> button up top, or the global
            hotkey <Kbd>Ctrl</Kbd> <Kbd>Alt</Kbd> <Kbd>C</Kbd> from any app.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <Wand2 className="h-4 w-4 text-krypt-purple" /> Start from a preset
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-krypt-muted">
            Not sure where to begin? The <span className="text-white/90">Presets</span> page has nine
            ready-made looks — pick one, then tweak it to taste.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: MessageCircle,
    eyebrow: 'Join the community',
    title: 'You’re all set!',
    render: (open) => (
      <div className="space-y-2.5">
        <p className="text-sm leading-relaxed text-krypt-muted">
          Krypt is built in the open. Come hang out, share presets, and grab more free tools:
        </p>
        <CommunityLink
          icon={MessageCircle}
          title="Join the Krypt Discord"
          desc="Help, presets, and feature requests."
          onClick={() => open(DISCORD_URL)}
        />
        <CommunityLink
          icon={Twitter}
          title="Follow @yuhgoslavia on X"
          desc="Updates, new tools and behind the scenes."
          onClick={() => open(X_URL)}
        />
        <CommunityLink
          icon={Globe}
          title="More free tools at krypt.cc"
          desc="Crosshair, macro, cleaner, tweaker and more."
          onClick={() => open(SITE_URL)}
        />
      </div>
    ),
  },
];

export function Onboarding() {
  const { settings, update } = useApp();
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(true);
  const [closed, setClosed] = useState(false);

  if (!settings || settings.onboarded || closed) return null;

  const open = (url: string) => void window.krypt.app.openExternal(url);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const finish = () => {
    if (dontShow) void update({ onboarded: true });
    setClosed(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm animate-fade-in">
      <div className="relative w-[560px] max-w-full overflow-hidden rounded-2xl border border-white/10 bg-krypt-surface shadow-krypt-card animate-pop-in">
        <button
          onClick={finish}
          title="Skip"
          className="absolute right-3.5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-krypt-muted transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative bg-krypt-radial px-7 pt-8 pb-5">
          <div className="pointer-events-none absolute inset-0 bg-krypt-gradient opacity-[0.07]" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-krypt-gradient shadow-krypt-glow">
              <Icon className="h-6 w-6 text-white" />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-krypt-muted">
                {current.eyebrow}
              </div>
              <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{current.title}</h2>
            </div>
          </div>
        </div>

        <div className="px-7 pb-2 pt-1 min-h-[176px]">{current.render(open)}</div>

        <div className="mt-3 border-t border-white/5 px-7 py-4">
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-xs text-krypt-muted">
              <Switch checked={dontShow} onChange={setDontShow} />
              Don&apos;t show this again
            </label>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <GhostButton onClick={() => setStep((s) => s - 1)}>
                  <span className="flex items-center gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </span>
                </GhostButton>
              )}
              {isLast ? (
                <PrimaryButton onClick={finish}>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4" /> Get started
                  </span>
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={() => setStep((s) => s + 1)}>
                  <span className="flex items-center gap-1.5">
                    Next <ArrowRight className="h-4 w-4" />
                  </span>
                </PrimaryButton>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
                className={cls(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-krypt-gradient' : 'w-1.5 bg-white/15 hover:bg-white/30',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityLink({ icon: Icon, title, desc, onClick }: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-krypt-gradient shadow-krypt-glow">
        <Icon className="h-4 w-4 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white/90">{title}</div>
        <div className="truncate text-xs text-krypt-muted">{desc}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-krypt-muted transition group-hover:translate-x-0.5 group-hover:text-white" />
    </button>
  );
}
