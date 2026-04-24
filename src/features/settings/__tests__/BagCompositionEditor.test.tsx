// BagCompositionEditor tests — Q7 gold count + validation.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BagCompositionEditor } from '../BagCompositionEditor.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';

describe('<BagCompositionEditor />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('shows default total = 61 (6×10 + 1)', () => {
    render(<BagCompositionEditor />);
    expect(screen.getByTestId('bag-total')).toHaveTextContent('61');
  });

  it('saves valid values to settings.bagComposition', async () => {
    const user = userEvent.setup();
    render(<BagCompositionEditor />);

    const regular = screen.getByLabelText(/regular clips per color/i);
    const gold = screen.getByLabelText(/gold clip count/i);

    await user.clear(regular);
    await user.type(regular, '12');
    await user.clear(gold);
    await user.type(gold, '3');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    const comp = getAppStore().getState().settings.bagComposition;
    expect(comp.regularPerColor).toBe(12);
    expect(comp.goldCount).toBe(3);
  });

  it('rejects out-of-range gold count', async () => {
    const user = userEvent.setup();
    render(<BagCompositionEditor />);

    const gold = screen.getByLabelText(/gold clip count/i);
    await user.clear(gold);
    await user.type(gold, '99');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/gold count/i);
    expect(getAppStore().getState().settings.bagComposition.goldCount).toBe(1);
  });

  it('rejects out-of-range regular-per-color', async () => {
    const user = userEvent.setup();
    render(<BagCompositionEditor />);

    const regular = screen.getByLabelText(/regular clips per color/i);
    await user.clear(regular);
    await user.type(regular, '99');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/regular/i);
    expect(
      getAppStore().getState().settings.bagComposition.regularPerColor,
    ).toBe(10);
  });
});
