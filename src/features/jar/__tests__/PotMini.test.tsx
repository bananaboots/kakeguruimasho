import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import { PotMini } from '../PotMini.tsx';

describe('PotMini dispatcher', () => {
  it('renders PachinkoPotMini when theme is pachinko', () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{
            theme: 'pachinko',
            themeMeta: THEMES.pachinko,
            setTheme: () => {},
          }}
        >
          <PotMini />
        </ThemeContext.Provider>
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-testid="pachinko-pot-mini"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-pot-mini"]')).toBeNull();
  });

  it('renders KowloonPotMini when theme is kowloon', () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{
            theme: 'kowloon',
            themeMeta: THEMES.kowloon,
            setTheme: () => {},
          }}
        >
          <PotMini />
        </ThemeContext.Provider>
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-testid="kowloon-pot-mini"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pachinko-pot-mini"]')).toBeNull();
  });

  it('falls back to PachinkoPotMini when visual is undefined', () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{
            theme: 'house',
            themeMeta: THEMES.house,
            setTheme: () => {},
          }}
        >
          <PotMini />
        </ThemeContext.Provider>
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-testid="pachinko-pot-mini"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-pot-mini"]')).toBeNull();
  });
});
