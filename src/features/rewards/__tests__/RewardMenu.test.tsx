// CRUD happy path for <RewardMenu />.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RewardMenu } from '../RewardMenu.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';

describe('<RewardMenu />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders default T1 rewards from store', () => {
    render(<RewardMenu tier="T1" />);
    expect(screen.getByText('15 min Reddit scroll')).toBeInTheDocument();
    expect(screen.getByText('One fun-book chapter')).toBeInTheDocument();
  });

  it('adds a new reward via the editor', async () => {
    const user = userEvent.setup();
    render(<RewardMenu tier="T2" />);

    await user.click(screen.getByRole('button', { name: /\+ Add to Tier/i }));
    const input = await screen.findByPlaceholderText(/YouTube/i);
    await user.type(input, 'New specialty pastry run');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByText('New specialty pastry run')).toBeInTheDocument();
    const stored = getAppStore().getState().rewards.T2;
    expect(stored.some((r) => r.label === 'New specialty pastry run')).toBe(true);
  });

  it('edits a reward label in place', async () => {
    const user = userEvent.setup();
    render(<RewardMenu tier="T3" />);
    const targetLabel = 'Full movie (at home or theater)';
    const item = screen.getByText(targetLabel).closest('li')!;
    await user.click(within(item).getByRole('button', { name: /edit/i }));

    const input = await screen.findByDisplayValue(targetLabel);
    await user.clear(input);
    await user.type(input, 'Theater night with popcorn');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.queryByText(targetLabel)).not.toBeInTheDocument();
    expect(screen.getByText('Theater night with popcorn')).toBeInTheDocument();
  });

  it('archives a reward (hidden from default list)', async () => {
    const user = userEvent.setup();
    render(<RewardMenu tier="T1" />);
    const targetLabel = '15 min Reddit scroll';
    const item = screen.getByText(targetLabel).closest('li')!;
    await user.click(within(item).getByRole('button', { name: /archive/i }));

    expect(screen.queryByText(targetLabel)).not.toBeInTheDocument();
    const stored = getAppStore().getState().rewards.T1;
    const archived = stored.find((r) => r.label === targetLabel);
    expect(archived?.archived).toBe(true);
  });

  it('empty-trimmed label does not create reward', async () => {
    const user = userEvent.setup();
    render(<RewardMenu tier="T1" />);
    await user.click(screen.getByRole('button', { name: /\+ Add to Tier/i }));
    const input = await screen.findByPlaceholderText(/YouTube/i);
    await user.type(input, '   ');
    // Save should be disabled because the untrimmed-non-empty input still
    // contains whitespace; we rely on the submit guard to enforce trim.
    const save = screen.getByRole('button', { name: /^save$/i });
    // With only whitespace, validity is true (length > 0) but trim() check
    // blocks. Simulate submit via click — should be a no-op.
    await user.click(save);
    const stored = getAppStore().getState().rewards.T1;
    expect(stored.every((r) => r.label.trim().length > 0)).toBe(true);
  });
});
