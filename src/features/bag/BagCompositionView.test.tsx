// Happy-path RTL test for <BagCompositionView /> (Wave 2 3B).
// Validates that the component renders the current bag composition from the
// store singleton, and highlights gold distinctly.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import BagCompositionView from './BagCompositionView.tsx';
import {
  __resetAppStoreForTests,
  setPersistenceEnabled,
} from '../../state/store.ts';
import { seedInitialAppState } from '../../data/defaults.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';

describe('<BagCompositionView />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders one tile per default color + a gold tile with correct counts', () => {
    render(<BagCompositionView jarId={DEFAULT_JAR_ID} />);

    // Six color tiles (default palette) + 1 gold = 7 tiles.
    const red = screen.getByLabelText(/^10 red$/);
    const blue = screen.getByLabelText(/^10 blue$/);
    const green = screen.getByLabelText(/^10 green$/);
    const yellow = screen.getByLabelText(/^10 yellow$/);
    const purple = screen.getByLabelText(/^10 purple$/);
    const pink = screen.getByLabelText(/^10 pink$/);
    const gold = screen.getByLabelText(/^1 gold$/);

    for (const tile of [red, blue, green, yellow, purple, pink]) {
      expect(within(tile).getByText('10')).toBeInTheDocument();
    }
    expect(within(gold).getByText('1')).toBeInTheDocument();
  });

  it('shows the total clip count in the header', () => {
    render(<BagCompositionView jarId={DEFAULT_JAR_ID} />);
    // D2: 6×10 + 1 = 61.
    expect(screen.getByLabelText('61 clips remaining')).toBeInTheDocument();
  });

  it('gold tile carries a distinct data attribute for styling hooks', () => {
    render(<BagCompositionView jarId={DEFAULT_JAR_ID} />);
    const gold = screen.getByLabelText(/^1 gold$/);
    expect(gold.getAttribute('data-color')).toBe('gold');
  });
});
