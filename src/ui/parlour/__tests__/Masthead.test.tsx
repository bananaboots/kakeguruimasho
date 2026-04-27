import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import { Masthead } from '../Masthead.tsx';

describe('Masthead dispatcher', () => {
  it('renders PachinkoMasthead at theme=pachinko', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <Masthead>
          <h1>Title</h1>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="pachinko-masthead"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-masthead"]')).toBeNull();
  });

  it('renders KowloonMasthead at theme=kowloon', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <Masthead>
          <h1>Title</h1>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-masthead"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pachinko-masthead"]')).toBeNull();
  });

  it('falls back to PachinkoMasthead when visual is undefined', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'house',
          themeMeta: THEMES.house,
          setTheme: () => {},
        }}
      >
        <Masthead>
          <h1>Title</h1>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="pachinko-masthead"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-masthead"]')).toBeNull();
  });
});

describe('Masthead Pachinko snapshot regression', () => {
  it('renders the same DOM structure as the inline parlour-masthead pattern', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <Masthead>
          <div className="parlour-masthead__kicker">Test Tagline</div>
          <h1 className="parlour-masthead__title">The Pull</h1>
          <p className="parlour-masthead__tagline">Pull the Lever · 3 steps to the reveal.</p>
        </Masthead>
      </ThemeContext.Provider>,
    );
    expect(container.firstChild).toMatchInlineSnapshot(`
      <header
        class="parlour-masthead"
        data-testid="pachinko-masthead"
      >
        <div
          class="parlour-masthead__kicker"
        >
          Test Tagline
        </div>
        <h1
          class="parlour-masthead__title"
        >
          The Pull
        </h1>
        <p
          class="parlour-masthead__tagline"
        >
          Pull the Lever · 3 steps to the reveal.
        </p>
      </header>
    `);
  });
});
