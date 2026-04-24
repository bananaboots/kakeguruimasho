// HygieneCutoffEditor tests — Q5 default + persistence.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HygieneCutoffEditor } from '../HygieneCutoffEditor.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';

describe('<HygieneCutoffEditor />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders the default 01:00', () => {
    render(<HygieneCutoffEditor />);
    expect(
      (screen.getByLabelText(/cutoff time/i) as HTMLInputElement).value,
    ).toBe('01:00');
  });

  it('saves a new cutoff to settings', async () => {
    const user = userEvent.setup();
    render(<HygieneCutoffEditor />);

    const input = screen.getByLabelText(/cutoff time/i) as HTMLInputElement;
    // Time inputs are awkward to type in jsdom; set via fireEvent.
    fireEvent.change(input, { target: { value: '02:30' } });
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(getAppStore().getState().settings.hygieneCutoffLocal).toBe('02:30');
  });
});
