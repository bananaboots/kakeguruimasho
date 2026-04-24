/**
 * BagCompositionEditor — regular-per-color + gold count (3I).
 *
 * Q7: gold count is a first-class setting (0–10). D2 default = 1.
 * `regularPerColor` range 1–30. Shows derived total = colors × regular + gold.
 */

import { useMemo, useState, type ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import { Input } from '../../ui/input.tsx';
import { useAppStore, getAppStore } from '../../state/store.ts';

const REG_MIN = 1;
const REG_MAX = 30;
const GOLD_MIN = 0;
const GOLD_MAX = 10;

export function BagCompositionEditor(): ReactElement {
  const comp = useAppStore((s) => s.settings.bagComposition);

  const [regular, setRegular] = useState(String(comp.regularPerColor));
  const [gold, setGold] = useState(String(comp.goldCount));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const derived = useMemo(() => {
    const r = Number(regular);
    const g = Number(gold);
    if (!Number.isFinite(r) || !Number.isFinite(g)) return null;
    return comp.colors.length * r + g;
  }, [regular, gold, comp.colors.length]);

  const validate = (): string | null => {
    const r = Number(regular);
    const g = Number(gold);
    if (!Number.isInteger(r) || r < REG_MIN || r > REG_MAX) {
      return `Regular per color must be a whole number between ${REG_MIN} and ${REG_MAX}.`;
    }
    if (!Number.isInteger(g) || g < GOLD_MIN || g > GOLD_MAX) {
      return `Gold count must be a whole number between ${GOLD_MIN} and ${GOLD_MAX}.`;
    }
    return null;
  };

  const handleSave = (): void => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const { actions, settings } = getAppStore().getState();
    actions.updateSettings({
      bagComposition: {
        ...settings.bagComposition,
        regularPerColor: Number(regular),
        goldCount: Number(gold),
      },
    });
    setError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <section
      className="settings__card"
      aria-labelledby="bag-comp-title"
      data-testid="bag-composition-editor"
    >
      <header>
        <h2 id="bag-comp-title" className="settings__title">
          Bag composition
        </h2>
        <p className="settings__hint">
          Colors × regular clips per color + gold clips. Changes apply
          the next time the bag refills.
        </p>
      </header>

      <label className="settings__field-label">
        <span>Regular per color ({REG_MIN}–{REG_MAX})</span>
        <Input
          type="number"
          inputMode="numeric"
          min={REG_MIN}
          max={REG_MAX}
          step={1}
          value={regular}
          onChange={(e) => setRegular(e.target.value)}
          aria-label="Regular clips per color"
        />
      </label>

      <label className="settings__field-label">
        <span>Gold clips ({GOLD_MIN}–{GOLD_MAX})</span>
        <Input
          type="number"
          inputMode="numeric"
          min={GOLD_MIN}
          max={GOLD_MAX}
          step={1}
          value={gold}
          onChange={(e) => setGold(e.target.value)}
          aria-label="Gold clip count"
        />
      </label>

      <p className="settings__hint">
        Colors: <strong>{comp.colors.length}</strong> · Total clips:{' '}
        <strong data-testid="bag-total">{derived ?? '—'}</strong>
      </p>

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
