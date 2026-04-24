// ResetAllDanger tests — triple-confirm required.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResetAllDanger } from '../ResetAllDanger.tsx';
import {
  __resetAppStoreForTests,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';

describe('<ResetAllDanger />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('requires three confirmations + the RESET phrase', async () => {
    const reload = vi.fn();
    const deleteDatabase = vi.fn();
    const user = userEvent.setup();

    render(<ResetAllDanger reload={reload} deleteDatabase={deleteDatabase} />);

    // Stage 1: tap the Reset button
    await user.click(screen.getByRole('button', { name: /reset all data/i }));
    expect(
      screen.getByRole('heading', { name: /are you sure/i }),
    ).toBeInTheDocument();

    // Stage 2: Continue
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(
      screen.getByRole('heading', { name: /really sure/i }),
    ).toBeInTheDocument();

    // Stage 3: Continue
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(
      screen.getByRole('heading', { name: /type to confirm/i }),
    ).toBeInTheDocument();

    // Submit disabled until we type the phrase.
    expect(screen.getByTestId('reset-confirm-button')).toBeDisabled();

    const input = screen.getByTestId('reset-confirm-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'RESET' } });
    expect(input.value).toBe('RESET');
    const resetBtn = screen.getByTestId('reset-confirm-button');
    expect(resetBtn).not.toBeDisabled();
    await user.click(resetBtn);

    expect(deleteDatabase).toHaveBeenCalledWith('kakeguruimasho');
    expect(reload).toHaveBeenCalled();
  });

  it('does not wipe when the phrase is wrong', async () => {
    const reload = vi.fn();
    const deleteDatabase = vi.fn();
    const user = userEvent.setup();

    render(<ResetAllDanger reload={reload} deleteDatabase={deleteDatabase} />);

    await user.click(screen.getByRole('button', { name: /reset all data/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    const input = screen.getByTestId('reset-confirm-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'nope' } });
    const resetBtn = screen.getByTestId('reset-confirm-button');
    expect(resetBtn).toBeDisabled();

    expect(deleteDatabase).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
