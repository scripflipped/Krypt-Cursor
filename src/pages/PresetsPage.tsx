import { useCallback, useEffect, useState } from 'react';
import { Save, Upload, Download, Trash2, Wand2 } from 'lucide-react';
import { Page, Section, Card, Row, Switch, Slider, GhostButton, PrimaryButton, Empty } from '../components/common';
import { useApp } from '../state/AppStateProvider';
import { useToast } from '../state/ToastProvider';
import { usePrompt, useConfirm } from '../state/ModalProvider';
import { BUILTIN_PRESETS } from '../../shared/presets';
import type { CustomPreset, Settings } from '../../shared/types';

const HOTKEY_PRESETS = ['CommandOrControl+Alt+C', 'CommandOrControl+Shift+C', 'Alt+X', ''];

export function PresetsPage() {
  const { settings, update } = useApp();
  const toast = useToast();
  const prompt = usePrompt();
  const confirm = useConfirm();
  const [custom, setCustom] = useState<CustomPreset[]>([]);

  const refresh = useCallback(async () => {
    const res = await window.krypt.presets.list();
    if (res.ok && res.data) setCustom(res.data);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  if (!settings) return null;
  const b = settings.behavior;
  const setBehavior = (patch: Partial<typeof b>) => update({ behavior: { ...b, ...patch } });

  const applyPreset = (ps: Partial<Settings>) => {
    const patch: Partial<Settings> = {};
    for (const key of Object.keys(ps) as (keyof Settings)[]) {
      const pv = ps[key];
      const cur = settings[key];
      if (pv && typeof pv === 'object' && !Array.isArray(pv) && cur && typeof cur === 'object') {
        (patch as Record<string, unknown>)[key] = { ...cur, ...pv };
      } else {
        (patch as Record<string, unknown>)[key] = pv;
      }
    }
    update(patch);
    toast.success('Preset applied.');
  };

  const saveCurrent = async () => {
    const name = await prompt({ title: 'Save preset', body: 'Name this look — it saves your cursor, trail, click, sounds and behavior.', value: 'My preset' });
    if (name === null) return;
    const snapshot: Partial<Settings> = {
      cursor: settings.cursor, trail: settings.trail, click: settings.click,
      sound: settings.sound, keySound: settings.keySound, behavior: settings.behavior,
    };
    const res = await window.krypt.presets.save(name, snapshot);
    if (res.ok) { toast.success(res.message); await refresh(); } else toast.error(res.message);
  };

  const removeCustom = async (p: CustomPreset) => {
    if (!(await confirm({ title: `Delete "${p.name}"?`, body: 'This removes the saved preset.', confirmLabel: 'Delete', destructive: true }))) return;
    const res = await window.krypt.presets.remove(p.id);
    if (res.ok) { toast.success('Deleted.'); await refresh(); } else toast.error(res.message);
  };

  const exportCustom = async (p: CustomPreset) => {
    const res = await window.krypt.presets.export(p.id);
    if (res.ok) toast.success(res.message);
    else if (!res.message.includes('cancel')) toast.error(res.message);
  };

  const importCustom = async () => {
    const res = await window.krypt.presets.import();
    if (res.ok && res.data) { toast.success(res.message); await refresh(); }
    else if (!res.message.includes('cancel')) toast.error(res.message);
  };

  return (
    <Page
      title="Presets"
      subtitle="One-click looks, your own saved presets, and global behavior."
      actions={<PrimaryButton onClick={saveCurrent}><span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save current</span></PrimaryButton>}
    >
      <Section eyebrow="Built-in looks">
        <div className="grid grid-cols-3 gap-3">
          {BUILTIN_PRESETS.map((p) => (
            <Card key={p.id} hoverable className="cursor-pointer" >
              <button onClick={() => applyPreset(p.settings)} className="w-full text-left">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-krypt-purple" />
                  <span className="font-semibold">{p.name}</span>
                </div>
                <p className="mt-1 text-xs text-krypt-muted">{p.description}</p>
              </button>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="Your presets">
        <Card>
          <div className="mb-3 flex justify-end">
            <GhostButton onClick={importCustom}><span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Import</span></GhostButton>
          </div>
          {custom.length === 0 ? (
            <Empty>No saved presets yet — tune a look, then “Save current”.</Empty>
          ) : (
            <div className="space-y-1.5">
              {custom.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <button onClick={() => applyPreset(p.settings)} className="flex-1 text-left text-sm font-medium hover:text-white">{p.name}</button>
                  <button onClick={() => applyPreset(p.settings)} className="rounded-md px-2 py-1 text-xs text-krypt-muted hover:text-white">Apply</button>
                  <button onClick={() => exportCustom(p)} className="rounded-md p-1 text-krypt-muted hover:text-white" title="Export"><Download className="h-3.5 w-3.5" /></button>
                  <button onClick={() => removeCustom(p)} className="rounded-md p-1 text-krypt-muted hover:text-rose-300" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section eyebrow="Global behavior">
        <Card>
          <Row label="Rainbow speed" hint="For the rainbow color mode"><Slider value={b.rainbowSpeed} min={0} max={600} onChange={(v) => setBehavior({ rainbowSpeed: v })} suffix="°/s" /></Row>
          <Row label="Hide effects when idle"><Switch checked={b.hideOnIdle} onChange={(v) => setBehavior({ hideOnIdle: v })} /></Row>
          <Row label="Idle delay"><Slider value={b.idleSeconds} min={1} max={30} onChange={(v) => setBehavior({ idleSeconds: v })} suffix="s" /></Row>
        </Card>
      </Section>

      <Section eyebrow="Hotkey & startup">
        <Card>
          <Row label="Toggle effects hotkey" hint="Global shortcut to turn effects on/off">
            <input
              value={settings.hotkeys.toggle}
              onChange={(e) => update({ hotkeys: { toggle: e.target.value } })}
              placeholder="Disabled"
              className="w-56 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-right font-mono text-xs outline-none focus:border-krypt-purple/50"
            />
          </Row>
          <div className="mb-1 flex flex-wrap justify-end gap-1.5">
            {HOTKEY_PRESETS.map((h) => (
              <button
                key={h || 'off'}
                onClick={() => update({ hotkeys: { toggle: h } })}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-krypt-muted hover:text-white hover:border-white/20"
              >
                {h || 'Disabled'}
              </button>
            ))}
          </div>
          <Row label="Start with Windows" hint="Launch Krypt Cursor at login">
            <Switch checked={settings.startWithWindows} onChange={(v) => update({ startWithWindows: v })} />
          </Row>
        </Card>
      </Section>
    </Page>
  );
}
