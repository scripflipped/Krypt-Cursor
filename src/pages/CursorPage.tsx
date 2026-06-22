import { useEffect, useState } from 'react';
import { Page, Section, Card, Row, Switch, Slider, Choices, GhostButton, Badge, ColorInput } from '../components/common';
import { ColorControl } from '../components/ColorControl';
import { PreviewStage } from '../components/PreviewStage';
import { AssetPicker } from '../components/AssetPicker';
import { useApp } from '../state/AppStateProvider';
import { useToast } from '../state/ToastProvider';
import type { CursorShape } from '../../shared/types';

const SHAPES: { value: CursorShape; label: string }[] = [
  { value: 'glow', label: 'Glow' },
  { value: 'dot', label: 'Dot' },
  { value: 'ring', label: 'Ring' },
  { value: 'crosshair', label: 'Cross' },
  { value: 'plus', label: 'Plus' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'roulette', label: 'Roulette' },
];

export function CursorPage() {
  const { settings, update } = useApp();
  const toast = useToast();
  const [admin, setAdmin] = useState<{ elevated: boolean; supported: boolean } | null>(null);

  useEffect(() => {
    window.krypt.system.elevation().then(setAdmin);
  }, []);

  const restartAsAdmin = async () => {
    const res = await window.krypt.system.relaunchAsAdmin();
    if (!res.ok) toast.warn(res.message);
  };

  if (!settings) return null;
  const c = settings.cursor;
  const set = (patch: Partial<typeof c>) => update({ cursor: { ...c, ...patch } });
  const usingImage = c.imageId !== null;

  return (
    <Page title="Cursor" subtitle="Shape, color, glow and motion — or upload your own cursor image.">
      <Section>
        <PreviewStage height={210} />
      </Section>

      <Section eyebrow="Cursor image">
        <Card>
          <AssetPicker kind="cursor" selectedId={c.imageId} onSelect={(id) => set({ imageId: id })} noneLabel="Use a built-in shape" />
          <p className="mt-3 text-xs text-krypt-muted">PNG, GIF, WEBP, SVG, ICO or CUR. Transparent PNGs look best.</p>
        </Card>
      </Section>

      {!usingImage && (
        <Section eyebrow="Built-in shape">
          <Card>
            <Choices value={c.shape} options={SHAPES} onChange={(shape) => set({ shape })} columns={4} />
            <div className="mt-4">
              <ColorControl value={c.color} onChange={(color) => set({ color })} />
            </div>
          </Card>
        </Section>
      )}

      <Section eyebrow="Appearance">
        <Card>
          <Row label="Size"><Slider value={c.size} min={6} max={160} onChange={(v) => set({ size: v })} suffix="px" /></Row>
          <Row label="Opacity"><Slider value={c.opacity} min={0.1} max={1} step={0.01} onChange={(v) => set({ opacity: v })} /></Row>
          <Row label="Glow"><Slider value={c.glow} min={0} max={1} step={0.01} onChange={(v) => set({ glow: v })} /></Row>
          <Row label="Rotation"><Slider value={c.rotation} min={0} max={360} onChange={(v) => set({ rotation: v })} suffix="°" /></Row>
        </Card>
      </Section>

      <Section eyebrow="Outline">
        <Card>
          <Row label="Outline" hint="A solid edge around the cursor — works with built-in shapes and uploaded images">
            <Switch checked={c.outline.enabled} onChange={(v) => set({ outline: { ...c.outline, enabled: v } })} />
          </Row>
          <Row label="Color">
            <ColorInput value={c.outline.color} onChange={(color) => set({ outline: { ...c.outline, color } })} disabled={!c.outline.enabled} />
          </Row>
          <Row label="Thickness">
            <Slider value={c.outline.width} min={1} max={12} step={1} onChange={(v) => set({ outline: { ...c.outline, width: v } })} suffix="px" />
          </Row>
        </Card>
      </Section>

      <Section eyebrow="Motion">
        <Card>
          <Row label="Smoothing" hint="0 = snappy, 1 = floaty"><Slider value={c.smoothing} min={0} max={1} step={0.01} onChange={(v) => set({ smoothing: v })} /></Row>
          <Row label="Spin" hint="Auto-rotate the cursor"><Slider value={c.spin} min={0} max={720} onChange={(v) => set({ spin: v })} suffix="°/s" /></Row>
          <Row label="Pulse" hint="Breathing scale"><Slider value={c.pulse} min={0} max={1} step={0.01} onChange={(v) => set({ pulse: v })} /></Row>
          <Row label="Click pop" hint="Grow on click"><Slider value={c.clickScale} min={0} max={1} step={0.01} onChange={(v) => set({ clickScale: v })} /></Row>
        </Card>
      </Section>

      <Section eyebrow="Ghost">
        <Card>
          <Row label="Ghost trail" hint="Faded copies that lag behind — works with built-in shapes and uploaded images">
            <Switch checked={c.ghost.enabled} onChange={(v) => set({ ghost: { ...c.ghost, enabled: v } })} />
          </Row>
          <Row label="Count" hint="How many echoes">
            <Slider value={c.ghost.count} min={1} max={12} onChange={(v) => set({ ghost: { ...c.ghost, count: v } })} />
          </Row>
          <Row label="Opacity" hint="Brightness of the echoes">
            <Slider value={c.ghost.opacity} min={0.05} max={1} step={0.01} onChange={(v) => set({ ghost: { ...c.ghost, opacity: v } })} />
          </Row>
          <Row label="Lag" hint="How far they trail behind">
            <Slider value={c.ghost.delay} min={0} max={1} step={0.01} onChange={(v) => set({ ghost: { ...c.ghost, delay: v } })} />
          </Row>
        </Card>
      </Section>

      <Section eyebrow="Hotspot & system cursor">
        <Card>
          <Row label="Hotspot X" hint="Click point inside the image (0–1)"><Slider value={c.hotspotX} min={0} max={1} step={0.01} onChange={(v) => set({ hotspotX: v })} /></Row>
          <Row label="Hotspot Y"><Slider value={c.hotspotY} min={0} max={1} step={0.01} onChange={(v) => set({ hotspotY: v })} /></Row>
          <Row label="Hide the real Windows cursor" hint="Reversible — restored on quit.">
            <Switch checked={settings.hideSystemCursor} onChange={(v) => update({ hideSystemCursor: v })} />
          </Row>
          <Row
            label="Match the Windows cursor"
            hint="Mirror your cursor onto the real Windows pointer in the taskbar, admin apps and fullscreen games — where effects can't be drawn. Restored on reset or quit. Best paired with hiding the real cursor above."
          >
            <Switch checked={settings.systemCursorMatch} onChange={(v) => update({ systemCursorMatch: v })} />
          </Row>
        </Card>
      </Section>

      <Section eyebrow="Taskbar, games & admin apps">
        <Card>
          <p className="text-sm text-white/90">
            In places the custom cursor can't be drawn — the taskbar, Start menu and search,
            fullscreen games, and apps running as administrator — it automatically switches back to
            the normal Windows pointer, then returns the moment you leave. No setup needed.
          </p>
          <Row
            label="Custom cursor over admin apps"
            hint={
              admin?.elevated
                ? 'Running as administrator — the custom cursor works over elevated windows too.'
                : 'Optional: restart elevated to keep the custom cursor over admin apps as well. (The taskbar always uses the normal pointer.)'
            }
          >
            {admin?.elevated ? (
              <Badge tone="success">Administrator</Badge>
            ) : (
              <GhostButton onClick={restartAsAdmin} disabled={!admin?.supported}>
                Restart as admin
              </GhostButton>
            )}
          </Row>
          {admin && !admin.elevated && !admin.supported && (
            <p className="mt-1 text-xs text-krypt-muted">Available in the installed build.</p>
          )}
          <p className="mt-2 text-xs text-krypt-muted">
            On the Windows UAC prompt, sign-in screen, and Ctrl+Alt+Del the normal pointer always
            shows — those run on a separate secure desktop that no app can draw on.
          </p>
        </Card>
      </Section>
    </Page>
  );
}
