import { Page, Section, Card, Row, Switch, Slider } from '../components/common';
import { PreviewStage } from '../components/PreviewStage';
import { AssetPicker } from '../components/AssetPicker';
import { useApp } from '../state/AppStateProvider';

export function SoundsPage() {
  const { settings, update } = useApp();
  if (!settings) return null;
  const s = settings.sound;
  const k = settings.keySound;
  const setClick = (patch: Partial<typeof s>) => update({ sound: { ...s, ...patch } });
  const setKey = (patch: Partial<typeof k>) => update({ keySound: { ...k, ...patch } });

  return (
    <Page title="Sounds" subtitle="Play a sound on every click and a clicky key sound as you type.">
      <Section>
        <PreviewStage height={180} withSound />
      </Section>

      <Section eyebrow="Click sound">
        <Card>
          <Row label="Enable click sound">
            <Switch checked={s.enabled} onChange={(v) => setClick({ enabled: v })} />
          </Row>
          <Row label="Volume">
            <Slider value={s.volume} min={0} max={1} step={0.01} onChange={(v) => setClick({ volume: v })} />
          </Row>
          <Row label="Pitch variation" hint="Random pitch so it sounds less robotic">
            <Slider value={s.pitchJitter} min={0} max={1} step={0.01} onChange={(v) => setClick({ pitchJitter: v })} />
          </Row>
          <AssetPicker kind="sound" selectedId={s.soundId} onSelect={(id) => setClick({ soundId: id })} noneLabel="Built-in click" />
        </Card>
      </Section>

      <Section eyebrow="Typing sounds">
        <Card>
          <Row label="Enable typing sounds" hint="A clicky mechanical sound on every keypress, system-wide.">
            <Switch checked={k.enabled} onChange={(v) => setKey({ enabled: v })} />
          </Row>
          <Row label="Volume">
            <Slider value={k.volume} min={0} max={1} step={0.01} onChange={(v) => setKey({ volume: v })} />
          </Row>
          <Row label="Pitch variation" hint="Random pitch per keystroke">
            <Slider value={k.pitchJitter} min={0} max={1} step={0.01} onChange={(v) => setKey({ pitchJitter: v })} />
          </Row>
          <AssetPicker kind="sound" selectedId={k.soundId} onSelect={(id) => setKey({ soundId: id })} noneLabel="Built-in clack" />
          <p className="mt-3 text-xs text-krypt-muted">With typing sounds on, start typing anywhere to hear it. WAV, MP3, OGG, M4A or FLAC for a custom keystroke sound.</p>
        </Card>
      </Section>
    </Page>
  );
}
