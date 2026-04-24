/**
 * WheelConfigEditor — sliders for T1/T2/T3/BONUS/JACKPOT + bonus segments.
 *
 * A16: weights must sum to 1.0 (± 0.001 tolerance). On invalid sum we
 * block save and offer an "Auto-normalize" button that rescales the
 * current drafts to total 1.0 (preserving relative ratios).
 *
 * Sliders render 0–100 integer %; we store 0–1 fractions in
 * `WheelConfig.weights`. Conversion is round-trip-safe via /100.
 */

import { useMemo, useState, type ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import { Slider } from '../../ui/slider.tsx';
import { useAppStore, getAppStore } from '../../state/store.ts';
import type { JarId } from '../../types/ids.ts';
import type {
  BonusSegment,
  MainWheelTier,
} from '../../types/wheel.ts';

const MAIN_TIERS: MainWheelTier[] = ['T1', 'T2', 'T3', 'BONUS', 'JACKPOT'];
const BONUS_SEGMENTS: BonusSegment[] = ['PCT_75', 'PCT_50', 'PCT_25', 'FREE', 'EXTRA'];

/** How close to 1.0 a weight-set must sum to pass validation (A16). */
export const WHEEL_SUM_TOLERANCE = 0.001;

type PercentMap<K extends string> = Record<K, number>;

function toPercent<K extends string>(map: Record<K, number>): PercentMap<K> {
  const out = {} as PercentMap<K>;
  for (const k of Object.keys(map) as K[]) {
    out[k] = Math.round((map[k] ?? 0) * 100);
  }
  return out;
}

function toFraction<K extends string>(map: PercentMap<K>): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of Object.keys(map) as K[]) {
    out[k] = (map[k] ?? 0) / 100;
  }
  return out;
}

function sumOf<K extends string>(map: Record<K, number>): number {
  let s = 0;
  for (const k of Object.keys(map) as K[]) s += map[k] ?? 0;
  return s;
}

function normalize<K extends string>(map: Record<K, number>): Record<K, number> {
  const total = sumOf(map);
  if (total <= 0) {
    const n = Object.keys(map).length;
    const even = Math.round(100 / n);
    const out = {} as Record<K, number>;
    let used = 0;
    (Object.keys(map) as K[]).forEach((k, i, arr) => {
      out[k] = i === arr.length - 1 ? 100 - used : even;
      used += even;
    });
    return out;
  }
  // Largest-remainder rounding to reach 100 exactly.
  const raw = {} as Record<K, number>;
  for (const k of Object.keys(map) as K[]) {
    raw[k] = ((map[k] ?? 0) / total) * 100;
  }
  const floors = {} as Record<K, number>;
  let floorSum = 0;
  for (const k of Object.keys(raw) as K[]) {
    floors[k] = Math.floor(raw[k] ?? 0);
    floorSum += floors[k] ?? 0;
  }
  const remainders = (Object.keys(raw) as K[])
    .map((k) => ({ k, r: (raw[k] ?? 0) - (floors[k] ?? 0) }))
    .sort((a, b) => b.r - a.r);
  let toDistribute = 100 - floorSum;
  const out = { ...floors };
  for (const { k } of remainders) {
    if (toDistribute <= 0) break;
    out[k] = (out[k] ?? 0) + 1;
    toDistribute -= 1;
  }
  return out;
}

export interface WheelConfigEditorProps {
  jarId: JarId;
}

export function WheelConfigEditor({ jarId }: WheelConfigEditorProps): ReactElement {
  const wheel = useAppStore((s) => s.wheelConfigs[jarId]);

  const initialMain = useMemo(
    () =>
      toPercent(
        wheel?.weights ?? {
          T1: 0.4,
          T2: 0.3,
          T3: 0.2,
          BONUS: 0.08,
          JACKPOT: 0.02,
        },
      ),
    [wheel],
  );
  const initialBonus = useMemo(
    () =>
      toPercent(
        wheel?.bonusWeights ?? {
          PCT_75: 0.35,
          PCT_50: 0.25,
          PCT_25: 0.15,
          FREE: 0.1,
          EXTRA: 0.15,
        },
      ),
    [wheel],
  );

  const [main, setMain] = useState<PercentMap<MainWheelTier>>(initialMain);
  const [bonus, setBonus] = useState<PercentMap<BonusSegment>>(initialBonus);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mainSum = sumOf(main);
  const bonusSum = sumOf(bonus);
  const mainValid = Math.abs(mainSum - 100) <= WHEEL_SUM_TOLERANCE * 100;
  const bonusValid = Math.abs(bonusSum - 100) <= WHEEL_SUM_TOLERANCE * 100;

  const handleSave = (): void => {
    if (!mainValid || !bonusValid) {
      setError(
        'Probabilities must sum to 100%. Use Auto-normalize or adjust the sliders.',
      );
      return;
    }
    getAppStore().getState().actions.updateWheelConfig(jarId, {
      weights: toFraction(main),
      bonusWeights: toFraction(bonus),
    });
    setError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const autoNormalize = (): void => {
    setMain(normalize(main));
    setBonus(normalize(bonus));
    setError(null);
  };

  return (
    <section
      className="settings__card"
      aria-labelledby="wheel-config-title"
      data-testid="wheel-config-editor"
    >
      <header>
        <h2 id="wheel-config-title" className="settings__title">
          Wheel probabilities
        </h2>
        <p className="settings__hint">
          Tune how often each slice comes up. Each group must sum to 100%.
        </p>
      </header>

      <fieldset className="settings__row">
        <legend className="settings__field-label">Main wheel</legend>
        {MAIN_TIERS.map((tier) => (
          <div key={tier} className="settings__slider-row">
            <span className="settings__label">{tier}</span>
            <Slider
              min={0}
              max={100}
              step={1}
              value={main[tier] ?? 0}
              onValueChange={(v) => setMain((m) => ({ ...m, [tier]: v }))}
              aria-label={`${tier} probability`}
              aria-valuetext={`${main[tier] ?? 0}%`}
            />
            <span className="settings__value" aria-hidden="true">
              {main[tier] ?? 0}%
            </span>
          </div>
        ))}
        <div className="settings__sum" data-valid={mainValid}>
          <span>Total</span>
          <span data-testid="main-sum">{mainSum}%</span>
        </div>
      </fieldset>

      <fieldset className="settings__row">
        <legend className="settings__field-label">Bonus wheel</legend>
        {BONUS_SEGMENTS.map((seg) => (
          <div key={seg} className="settings__slider-row">
            <span className="settings__label">{prettyBonus(seg)}</span>
            <Slider
              min={0}
              max={100}
              step={1}
              value={bonus[seg] ?? 0}
              onValueChange={(v) => setBonus((m) => ({ ...m, [seg]: v }))}
              aria-label={`${seg} probability`}
              aria-valuetext={`${bonus[seg] ?? 0}%`}
            />
            <span className="settings__value" aria-hidden="true">
              {bonus[seg] ?? 0}%
            </span>
          </div>
        ))}
        <div className="settings__sum" data-valid={bonusValid}>
          <span>Total</span>
          <span data-testid="bonus-sum">{bonusSum}%</span>
        </div>
      </fieldset>

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
        <Button variant="secondary" onClick={autoNormalize}>
          Auto-normalize
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </section>
  );
}

function prettyBonus(seg: BonusSegment): string {
  switch (seg) {
    case 'PCT_75':
      return '75% off';
    case 'PCT_50':
      return '50% off';
    case 'PCT_25':
      return '25% off';
    case 'FREE':
      return 'Free';
    case 'EXTRA':
      return 'Extra spin';
  }
}
