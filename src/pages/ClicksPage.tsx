import { Page, Section, Card, Row, Switch, Slider, Choices } from '../components/common';
import { ColorControl } from '../components/ColorControl';
import { PreviewStage } from '../components/PreviewStage';
import { useApp } from '../state/AppStateProvider';
import { cls, splitEmojis } from '../utils/format';
import type { ClickEffect } from '../../shared/types';

const EFFECTS: { value: ClickEffect; label: string }[] = [
  { value: 'ring', label: 'Ring' },
  { value: 'ripple', label: 'Ripple' },
  { value: 'shockwave', label: 'Shockwave' },
  { value: 'burst', label: 'Burst' },
  { value: 'sparkle', label: 'Sparkle' },
  { value: 'confetti', label: 'Confetti' },
  { value: 'stars', label: 'Stars' },
  { value: 'hearts', label: 'Hearts' },
  { value: 'emoji', label: 'Emoji' },
  { value: 'text', label: 'Text' },
];

const PARTICLE: ClickEffect[] = ['burst', 'sparkle', 'confetti', 'stars', 'hearts', 'emoji'];

const EMOJI_PALETTE = [
  '🎉', '🎊', '✨', '🥳', '🔥', '💜', '❤️', '💯',
  '⭐', '🌈', '💀', '😂', '😎', '👀', '💎', '⚡',
  '🍀', '🌸', '🪩', '👑', '🚀', '🙏', '🤯', '🥶',
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = splitEmojis(value);
  const has = (e: string) => selected.includes(e);
  const toggle = (e: string) => {
    const next = has(e) ? selected.filter((x) => x !== e) : [...selected, e];
    onChange(next.join('').slice(0, 60));
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs text-krypt-muted">
        Pick the emojis that explode on click — a random one is chosen for every particle.
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {EMOJI_PALETTE.map((e) => (
          <button
            key={e}
            onClick={() => toggle(e)}
            className={cls(
              'flex aspect-square items-center justify-center rounded-lg border text-xl transition',
              has(e)
                ? 'border-krypt-purple/60 bg-krypt-purple/15 shadow-krypt-glow'
                : 'border-white/10 bg-white/5 hover:border-white/25',
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <Row label="Custom" hint="Type or paste any emojis you like">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 60))}
          placeholder="🎉🎊✨"
          className="w-44 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-center text-lg outline-none focus:border-krypt-purple/50"
        />
      </Row>
      {selected.length === 0 && (
        <div className="text-xs text-amber-300/80">Nothing selected — ✨ will be used.</div>
      )}
    </div>
  );
}

export function ClicksPage() {
  const { settings, update } = useApp();
  if (!settings) return null;
  const c = settings.click;
  const set = (patch: Partial<typeof c>) => update({ click: { ...c, ...patch } });
  const isParticle = PARTICLE.includes(c.effect);

  return (
    <Page title="Click Effects" subtitle="A burst of effect at every click. Click the preview to try it.">
      <Section>
        <PreviewStage height={210} />
      </Section>

      <Section eyebrow="Effect">
        <Card>
          <Row label="Enable click effects"><Switch checked={c.enabled} onChange={(v) => set({ enabled: v })} /></Row>
          <div className="mt-2"><Choices value={c.effect} options={EFFECTS} onChange={(effect) => set({ effect })} columns={5} /></div>
          {c.effect === 'emoji' && <EmojiPicker value={c.emoji} onChange={(emoji) => set({ emoji })} />}
          {c.effect === 'text' && (
            <Row label="Text">
              <input
                value={c.text}
                onChange={(e) => set({ text: e.target.value.slice(0, 16) })}
                className="w-40 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm outline-none focus:border-krypt-purple/50"
              />
            </Row>
          )}
        </Card>
      </Section>

      <Section eyebrow="Triggers">
        <Card>
          <Row label="Left click"><Switch checked={c.buttons.left} onChange={(v) => set({ buttons: { ...c.buttons, left: v } })} /></Row>
          <Row label="Right click"><Switch checked={c.buttons.right} onChange={(v) => set({ buttons: { ...c.buttons, right: v } })} /></Row>
          <Row label="Middle click"><Switch checked={c.buttons.middle} onChange={(v) => set({ buttons: { ...c.buttons, middle: v } })} /></Row>
        </Card>
      </Section>

      <Section eyebrow="Color">
        <Card>
          <ColorControl value={c.color} onChange={(color) => set({ color })} />
        </Card>
      </Section>

      <Section eyebrow="Shape & physics">
        <Card>
          <Row label="Size"><Slider value={c.size} min={8} max={140} onChange={(v) => set({ size: v })} suffix="px" /></Row>
          <Row label="Glow"><Slider value={c.glow} min={0} max={1} step={0.01} onChange={(v) => set({ glow: v })} /></Row>
          <Row label="Lifetime"><Slider value={c.lifetime} min={0.3} max={2.5} step={0.05} onChange={(v) => set({ lifetime: v })} suffix="x" /></Row>
          {isParticle && (
            <>
              <Row label="Count"><Slider value={c.count} min={3} max={80} onChange={(v) => set({ count: v })} /></Row>
              <Row label="Spread"><Slider value={c.spread} min={0} max={1} step={0.01} onChange={(v) => set({ spread: v })} /></Row>
              <Row label="Gravity" hint="Negative floats up, positive falls"><Slider value={c.gravity} min={-1} max={1} step={0.01} onChange={(v) => set({ gravity: v })} /></Row>
            </>
          )}
        </Card>
      </Section>
    </Page>
  );
}
