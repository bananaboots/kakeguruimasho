/**
 * HandTrayCard chip dispatch tests (Kowloon Electric Task 8).
 *
 * Asserts positively on both branches:
 *   - theme=pachinko → pile renders `<Chip>` SVGs, no ArcadeToken testids
 *   - theme=kowloon  → pile renders `<ArcadeToken>` elements
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { HandTrayCard } from '../HandTrayCard.tsx';
import { ThemeContext } from '../../../styles/theme-context.ts';
import { THEMES } from '../../../styles/themes.ts';
import {
  __resetAppStoreForTests,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { DEFAULT_JAR_ID, asClipId, type ClipId } from '../../../types/ids.ts';
import type { AppState } from '../../../types/app-state.ts';
import type { Clip, ClipColor } from '../../../types/clip.ts';

function seedWithHand(): AppState {
  const s = seedInitialAppState();
  const colors: ClipColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];
  const clips: Clip[] = colors.map((color, i) => ({
    id: asClipId(`clip${i}`) as ClipId,
    jarId: DEFAULT_JAR_ID,
    kind: 'regular',
    color,
  }));
  return {
    ...s,
    hands: {
      ...s.hands,
      [DEFAULT_JAR_ID]: clips,
    },
  };
}

describe('HandTrayCard chip dispatch', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedWithHand());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders Pachinko Chip (no arcade tokens) when theme=pachinko', () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{
            theme: 'pachinko',
            themeMeta: THEMES.pachinko,
            setTheme: () => {},
          }}
        >
          <HandTrayCard />
        </ThemeContext.Provider>
      </MemoryRouter>,
    );
    const pile = container.querySelector('.hand-tray__pile');
    expect(pile).not.toBeNull();
    // Positive: pile is non-empty (chips rendered as SVGs).
    expect(pile?.querySelectorAll('svg').length).toBeGreaterThan(0);
    // Negative: no Kowloon arcade tokens.
    expect(container.querySelector('[data-testid="arcade-token"]')).toBeNull();
  });

  it('renders ArcadeToken when theme=kowloon', () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{
            theme: 'kowloon',
            themeMeta: THEMES.kowloon,
            setTheme: () => {},
          }}
        >
          <HandTrayCard />
        </ThemeContext.Provider>
      </MemoryRouter>,
    );
    const tokens = container.querySelectorAll('[data-testid="arcade-token"]');
    // Positive: one token per regular clip in the seeded hand (6).
    expect(tokens.length).toBe(6);
  });

  it('renders a star-glyph arcade token for gold clips at theme=kowloon', () => {
    const seed = seedInitialAppState();
    const goldClip: Clip = {
      id: asClipId('gold-1') as ClipId,
      jarId: DEFAULT_JAR_ID,
      kind: 'gold',
    };
    const regulars: Clip[] = (['red', 'blue'] as ClipColor[]).map((color, i) => ({
      id: asClipId(`reg${i}`) as ClipId,
      jarId: DEFAULT_JAR_ID,
      kind: 'regular',
      color,
    }));
    __resetAppStoreForTests({
      ...seed,
      hands: {
        ...seed.hands,
        [DEFAULT_JAR_ID]: [goldClip, ...regulars],
      },
    });

    const { container } = render(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{
            theme: 'kowloon',
            themeMeta: THEMES.kowloon,
            setTheme: () => {},
          }}
        >
          <HandTrayCard />
        </ThemeContext.Provider>
      </MemoryRouter>,
    );

    // Star glyph appears (load-bearing differentiation for gold).
    expect(container.textContent).toContain('★');
    // Gold token color is the new distinct value, NOT the old #caa248
    // (which was byte-identical to --clip-yellow).
    const html = container.innerHTML;
    expect(html).toContain('#e8c682');
    expect(html).not.toContain('#caa248');
  });

  it('falls back to Pachinko Chip when themeMeta.visual is undefined', () => {
    // `house` theme has no `visual` field — exercises fallback branch.
    const { container } = render(
      <MemoryRouter>
        <ThemeContext.Provider
          value={{
            theme: 'house',
            themeMeta: THEMES.house,
            setTheme: () => {},
          }}
        >
          <HandTrayCard />
        </ThemeContext.Provider>
      </MemoryRouter>,
    );
    const pile = container.querySelector('.hand-tray__pile');
    expect(pile?.querySelectorAll('svg').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="arcade-token"]')).toBeNull();
  });
});
