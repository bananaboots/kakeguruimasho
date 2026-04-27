/**
 * ThemeToggle — picks the active parlour theme.
 *
 * Reads from `useTheme()` and dispatches via the same `setTheme()` setter
 * the provider exposes. Persistence is handled by `ThemeProvider`
 * (localStorage key `kakegurui:theme`).
 *
 * Themes with `status: 'ready'` (Pachinko, Kowloon Electric) ship a
 * full bespoke flow. Stub themes re-skin the Pachinko chassis via CSS
 * variables and fall through to Pachinko variants for the dispatched
 * slots — they're functional but visually less complete.
 */

import type { ReactElement } from 'react';

import { useTheme } from '../../styles/theme-context.ts';
import { THEME_KEYS, THEMES, type ThemeKey } from '../../styles/themes.ts';

export function ThemeToggle(): ReactElement {
  const { theme, setTheme } = useTheme();

  return (
    <section
      className="settings__card"
      aria-labelledby="theme-toggle-title"
      data-testid="theme-toggle"
    >
      <header>
        <h2 id="theme-toggle-title" className="settings__title">
          Theme
        </h2>
        <p className="settings__hint">
          Pick the parlour aesthetic. Mechanics are identical across themes.
        </p>
      </header>

      <div
        className="theme-toggle"
        role="radiogroup"
        aria-label="Parlour theme"
      >
        {THEME_KEYS.map((key: ThemeKey) => {
          const meta = THEMES[key];
          const selected = theme === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`theme-toggle__option ${selected ? 'theme-toggle__option--selected' : ''}`}
              onClick={() => setTheme(key)}
              data-testid={`theme-${key}`}
            >
              <span className="theme-toggle__label">{meta.name}</span>
              <span className="theme-toggle__sub">{meta.tagline}</span>
              {meta.status === 'stub' && (
                <span className="theme-toggle__badge">Stub</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
