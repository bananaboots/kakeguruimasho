// WheelConfigEditor tests — A16 sum=1.0 validation + auto-normalize.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WheelConfigEditor } from '../WheelConfigEditor.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { DEFAULT_JAR_ID } from '../../../types/ids.ts';

describe('<WheelConfigEditor /> — A16', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders defaults summing to 100', () => {
    render(<WheelConfigEditor jarId={DEFAULT_JAR_ID} />);
    // 40+30+20+8+2 = 100.
    expect(screen.getByTestId('main-sum')).toHaveTextContent('100%');
    // 35+25+15+10+15 = 100.
    expect(screen.getByTestId('bonus-sum')).toHaveTextContent('100%');
  });

  it('blocks save when main sum != 100%', async () => {
    const user = userEvent.setup();
    render(<WheelConfigEditor jarId={DEFAULT_JAR_ID} />);

    // Knock T1 down to 10 (total now 70) via the underlying range input.
    const t1 = screen.getByLabelText('T1 probability') as HTMLInputElement;
    fireEvent.change(t1, { target: { value: '10' } });
    expect(screen.getByTestId('main-sum')).toHaveTextContent('70%');

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/sum to 100/i);
    // Store unchanged.
    const cfg = getAppStore().getState().wheelConfigs[DEFAULT_JAR_ID]!;
    expect(cfg.weights.T1).toBe(0.4);
  });

  it('auto-normalize rescales to 100 and allows save', async () => {
    const user = userEvent.setup();
    render(<WheelConfigEditor jarId={DEFAULT_JAR_ID} />);

    // Push T1 to 50 so total = 110 (50+30+20+8+2).
    const t1 = screen.getByLabelText('T1 probability') as HTMLInputElement;
    fireEvent.change(t1, { target: { value: '50' } });
    expect(screen.getByTestId('main-sum')).toHaveTextContent('110%');

    await user.click(screen.getByRole('button', { name: /auto-normalize/i }));
    expect(screen.getByTestId('main-sum')).toHaveTextContent('100%');

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    const cfg = getAppStore().getState().wheelConfigs[DEFAULT_JAR_ID]!;
    const sum =
      cfg.weights.T1 +
      cfg.weights.T2 +
      cfg.weights.T3 +
      cfg.weights.BONUS +
      cfg.weights.JACKPOT;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
});
