// SfxHapticsToggles tests.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SfxHapticsToggles } from '../SfxHapticsToggles.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';

describe('<SfxHapticsToggles />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('toggles sfxEnabled in settings', async () => {
    const user = userEvent.setup();
    render(<SfxHapticsToggles />);

    const sfx = screen.getByRole('switch', { name: /sound effects/i });
    expect(sfx).toHaveAttribute('aria-checked', 'true');
    await user.click(sfx);
    expect(getAppStore().getState().settings.sfxEnabled).toBe(false);
  });

  it('toggles hapticsEnabled in settings', async () => {
    const user = userEvent.setup();
    render(<SfxHapticsToggles />);

    const haptics = screen.getByRole('switch', { name: /^haptics$/i });
    expect(haptics).toHaveAttribute('aria-checked', 'true');
    await user.click(haptics);
    expect(getAppStore().getState().settings.hapticsEnabled).toBe(false);
  });
});
