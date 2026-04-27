import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import { Streak } from '../Streak.tsx';

describe('Streak dispatcher', () => {
  it('renders PachinkoStreak when theme is pachinko', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <Streak />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="pachinko-streak"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-streak"]')).toBeNull();
  });

  it('renders KowloonStreak when theme is kowloon', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <Streak />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-streak"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pachinko-streak"]')).toBeNull();
  });

  it('falls back to PachinkoStreak when visual is undefined', () => {
    // `house` theme already has no `visual` field, so it exercises the
    // dispatcher's fallback branch directly.
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'house',
          themeMeta: THEMES.house,
          setTheme: () => {},
        }}
      >
        <Streak />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="pachinko-streak"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-streak"]')).toBeNull();
  });
});
