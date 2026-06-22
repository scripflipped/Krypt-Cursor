import { Page, Section, Card, Row, Switch, Slider, Choices } from '../components/common';
import { ColorControl } from '../components/ColorControl';
import { PreviewStage } from '../components/PreviewStage';
import { useApp } from '../state/AppStateProvider';
import type { TrailStyle } from '../../shared/types';

const STYLES: { value: TrailStyle; label: string }[] = [
  { value: 'comet', label: 'Comet' },
  { value: 'line', label: 'Line' },
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'neon', label: 'Neon' },
  { value: 'dots', label: 'Dots' },
  { value: 'bubbles', label: 'Bubbles' },
  { value: 'spark', label: 'Spark' },
];

export function TrailsPage() {
  const { settings, update } = useApp();
  if (!settings) return null;
  const t = settings.trail;
  const set = (patch: Partial<typeof t>) => update({ trail: { ...t, ...patch } });

  return (
    <Page title="Trails" subtitle="A glowing trail that follows your cursor as it moves.">
      <Section>
        <PreviewStage height={210} />
      </Section>

      <Section eyebrow="Trail">
        <Card>
          <Row label="Enable trail"><Switch checked={t.enabled} onChange={(v) => set({ enabled: v })} /></Row>
          <div className="mt-2"><Choices value={t.style} options={STYLES} onChange={(style) => set({ style })} columns={4} /></div>
        </Card>
      </Section>

      <Section eyebrow="Color">
        <Card>
          <ColorControl value={t.color} onChange={(color) => set({ color })} />
        </Card>
      </Section>

      <Section eyebrow="Shape">
        <Card>
          <Row label="Length" hint="How many points the trail keeps"><Slider value={t.length} min={4} max={80} onChange={(v) => set({ length: v })} /></Row>
          <Row label="Thickness"><Slider value={t.thickness} min={1} max={30} onChange={(v) => set({ thickness: v })} suffix="px" /></Row>
          <Row label="Fade" hint="Higher fades faster"><Slider value={t.fade} min={0} max={0.95} step={0.01} onChange={(v) => set({ fade: v })} /></Row>
          <Row label="Glow"><Slider value={t.glow} min={0} max={1} step={0.01} onChange={(v) => set({ glow: v })} /></Row>
          <Row label="Spacing" hint="Min distance between points"><Slider value={t.spacing} min={0.5} max={20} step={0.5} onChange={(v) => set({ spacing: v })} suffix="px" /></Row>
        </Card>
      </Section>
    </Page>
  );
}
