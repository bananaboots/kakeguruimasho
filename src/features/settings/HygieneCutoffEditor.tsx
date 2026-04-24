/**
 * HygieneCutoffEditor — HH:mm picker for the overnight hygiene cutoff (Q5).
 *
 * Default 01:00. Stored in `settings.hygieneCutoffLocal`. Validates
 * that the input parses to a valid 24-hour time.
 */

import { useState, type ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import { Input } from '../../ui/input.tsx';
import { useAppStore, getAppStore } from '../../state/store.ts';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function HygieneCutoffEditor(): ReactElement {
  const cutoff = useAppStore((s) => s.settings.hygieneCutoffLocal);
  const [value, setValue] = useState(cutoff ?? '01:00');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = (): void => {
    if (!TIME_RE.test(value)) {
      setError('Use 24-hour HH:mm (e.g. 01:00).');
      return;
    }
    getAppStore().getState().actions.updateSettings({ hygieneCutoffLocal: value });
    setError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <section
      className="settings__card"
      aria-labelledby="hygiene-cutoff-title"
      data-testid="hygiene-cutoff-editor"
    >
      <header>
        <h2 id="hygiene-cutoff-title" className="settings__title">
          Hygiene cutoff
        </h2>
        <p className="settings__hint">
          Complete your hygiene bundle by this time (local) to get
          credit for the day. Default 01:00.
        </p>
      </header>

      <label className="settings__field-label">
        <span>Cutoff time (24-hour)</span>
        <Input
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Hygiene cutoff time"
        />
      </label>

      {error ? (
        <p className="settings__error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="settings__hint" role="status">
          Saved.
        </p>
      ) : null}

      <div className="settings__actions">
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </section>
  );
}
