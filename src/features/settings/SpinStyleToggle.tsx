/**
 * SpinStyleToggle — picks the main-spin visualisation.
 *
 * Wheel: classic 50-slice circular wheel (default).
 * Reels: alternative 3-reel slot-strip ("PachinkoSpinWheel mode='reels'").
 *
 * Both visualisations consume the same RNG result from `spinMainWheel`;
 * this is purely cosmetic.
 */

import type { ReactElement } from 'react';

import { useAppStore, getAppStore } from '../../state/store.ts';
import type { SpinStyle } from '../../types/settings.ts';

const STYLES: ReadonlyArray<{ id: SpinStyle; label: string; sub: string }> = [
  { id: 'wheel', label: 'Wheel', sub: 'Classic 50-slice prize wheel' },
  { id: 'reels', label: 'Reels', sub: 'Three-reel slot strip' },
];

export function SpinStyleToggle(): ReactElement {
  const current = useAppStore((s) => s.settings.spinStyle);

  const set = (style: SpinStyle): void => {
    getAppStore().getState().actions.updateSettings({ spinStyle: style });
  };

  return (
    <section
      className="settings__card"
      aria-labelledby="spin-style-title"
      data-testid="spin-style-toggle"
    >
      <header>
        <h2 id="spin-style-title" className="settings__title">
          Spin style
        </h2>
        <p className="settings__hint">
          Pick how the main spin looks. Mechanics are identical either way.
        </p>
      </header>

      <div
        className="spin-style-toggle"
        role="radiogroup"
        aria-label="Spin style"
      >
        {STYLES.map((opt) => {
          const selected = current === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`spin-style-toggle__option ${selected ? 'spin-style-toggle__option--selected' : ''}`}
              onClick={() => set(opt.id)}
              data-testid={`spin-style-${opt.id}`}
            >
              <span className="spin-style-toggle__label">{opt.label}</span>
              <span className="spin-style-toggle__sub">{opt.sub}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
