/**
 * SfxHapticsToggles — SFX + haptics master toggles (3I).
 *
 * Writes `settings.sfxEnabled` and `settings.hapticsEnabled`. Also
 * pokes `setHapticsEnabled()` in the shell's haptics lib so the change
 * is live for the current session without a reload.
 */

import type { ReactElement } from 'react';
import { Switch } from '../../ui/switch.tsx';
import { useAppStore, getAppStore } from '../../state/store.ts';
import { setHapticsEnabled } from '../../lib/haptics.ts';

function setField(key: 'sfxEnabled' | 'hapticsEnabled', value: boolean): void {
  getAppStore().getState().actions.updateSettings({ [key]: value });
}

export function SfxHapticsToggles(): ReactElement {
  const sfx = useAppStore((s) => s.settings.sfxEnabled);
  const haptics = useAppStore((s) => s.settings.hapticsEnabled);

  return (
    <section
      className="settings__card"
      aria-labelledby="feedback-toggles-title"
      data-testid="sfx-haptics-toggles"
    >
      <header>
        <h2 id="feedback-toggles-title" className="settings__title">
          Sound &amp; haptics
        </h2>
        <p className="settings__hint">
          Turn off the buzz or the bleeps if you're somewhere quiet.
        </p>
      </header>

      <div className="settings__row-inline">
        <label className="settings__label" htmlFor="sfx-switch">
          Sound effects
        </label>
        <Switch
          id="sfx-switch"
          aria-label="Sound effects"
          checked={sfx}
          onCheckedChange={(v) => setField('sfxEnabled', v)}
        />
      </div>

      <div className="settings__row-inline">
        <label className="settings__label" htmlFor="haptics-switch">
          Haptics
        </label>
        <Switch
          id="haptics-switch"
          aria-label="Haptics"
          checked={haptics}
          onCheckedChange={(v) => {
            setField('hapticsEnabled', v);
            setHapticsEnabled(v);
          }}
        />
      </div>
    </section>
  );
}
