import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RevealStage } from '../RevealStage.tsx';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';

describe('<RevealStage />', () => {
  afterEach(cleanup);

  it('renders the spinning chrysanthemum + 大当たり banner for T3', () => {
    render(<RevealStage tier="T3" />);
    expect(screen.getByTestId('reveal-stage')).toBeInTheDocument();
    expect(screen.getByText('大当たり')).toBeInTheDocument();
    expect(screen.getByText(/TIER III/)).toBeInTheDocument();
    const bloom = screen.getByTestId('reveal-stage__bloom');
    expect(bloom.className).toMatch(/reveal-stage__bloom/);
  });

  it('renders nothing for T1/T2', () => {
    const { container } = render(<RevealStage tier="T1" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('RevealStage Kowloon branch', () => {
  afterEach(cleanup);

  it('renders the CRT phosphor reveal at theme=kowloon for T3', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <RevealStage tier="T3" />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="kowloon-reveal"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="reveal-stage"]')).toBeNull();
  });

  it('renders the existing Pachinko reveal at theme=pachinko for T3', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'pachinko',
          themeMeta: THEMES.pachinko,
          setTheme: () => {},
        }}
      >
        <RevealStage tier="T3" />
      </ThemeContext.Provider>,
    );
    expect(container.querySelector('[data-testid="reveal-stage"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kowloon-reveal"]')).toBeNull();
  });

  it('returns null at any theme for non-T3 tiers', () => {
    const { container } = render(
      <ThemeContext.Provider
        value={{
          theme: 'kowloon',
          themeMeta: THEMES.kowloon,
          setTheme: () => {},
        }}
      >
        <RevealStage tier="T1" />
      </ThemeContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
