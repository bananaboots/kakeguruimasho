// MilestoneEditor tests — target ordering, persistence into store.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MilestoneEditor } from '../MilestoneEditor.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import {
  DEFAULT_JAR_ID,
  MINI_MILESTONE_ID,
  MID_MILESTONE_ID,
  MOONSHOT_MILESTONE_ID,
} from '../../../types/ids.ts';

describe('<MilestoneEditor />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('rejects non-increasing targets', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MilestoneEditor jarId={DEFAULT_JAR_ID} onSave={onSave} />);

    // All three labels.
    await user.type(screen.getByLabelText('Mini label'), 'Small');
    await user.type(screen.getByLabelText('Mid label'), 'Medium');
    await user.type(screen.getByLabelText('Moonshot label'), 'Big');

    // Targets NOT strictly increasing: mini=100, mid=50, moonshot=200.
    await user.type(screen.getByLabelText('Mini target in dollars'), '100');
    await user.type(screen.getByLabelText('Mid target in dollars'), '50');
    await user.type(screen.getByLabelText('Moonshot target in dollars'), '200');

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/increase/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('accepts strictly increasing targets and persists into store', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MilestoneEditor jarId={DEFAULT_JAR_ID} onSave={onSave} />);

    await user.type(screen.getByLabelText('Mini label'), 'Small treat');
    await user.type(screen.getByLabelText('Mid label'), 'Nice dinner');
    await user.type(screen.getByLabelText('Moonshot label'), 'Hawaii');

    await user.type(screen.getByLabelText('Mini target in dollars'), '10');
    await user.type(screen.getByLabelText('Mid target in dollars'), '50');
    await user.type(screen.getByLabelText('Moonshot target in dollars'), '200');

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);

    const jar = getAppStore().getState().jars[DEFAULT_JAR_ID]!;
    expect(jar.milestones[MINI_MILESTONE_ID]!.target).toBe(10);
    expect(jar.milestones[MID_MILESTONE_ID]!.target).toBe(50);
    expect(jar.milestones[MOONSHOT_MILESTONE_ID]!.target).toBe(200);
    expect(jar.milestones[MINI_MILESTONE_ID]!.label).toBe('Small treat');
    expect(jar.milestones[MID_MILESTONE_ID]!.label).toBe('Nice dinner');
    expect(jar.milestones[MOONSHOT_MILESTONE_ID]!.label).toBe('Hawaii');
  });

  it('requires labels on all three milestones', async () => {
    const user = userEvent.setup();
    render(<MilestoneEditor jarId={DEFAULT_JAR_ID} />);

    // Bypass HTML required by filling label for mini only (leave mid/moonshot
    // blank but still submit — setCustomValidity won't block in jsdom
    // because we use the Button onClick path).
    await user.type(screen.getByLabelText('Mini label'), 'only this');
    await user.type(screen.getByLabelText('Mini target in dollars'), '10');
    await user.type(screen.getByLabelText('Mid target in dollars'), '20');
    await user.type(screen.getByLabelText('Moonshot target in dollars'), '30');

    // Native `required` prevents form submission in jsdom; we assert the
    // store was NOT mutated rather than the alert text.
    await user.click(screen.getByRole('button', { name: /save/i }));
    const jar = getAppStore().getState().jars[DEFAULT_JAR_ID]!;
    expect(jar.milestones[MID_MILESTONE_ID]!.label).toBe('');
    expect(jar.milestones[MID_MILESTONE_ID]!.target).toBe(0);
  });
});
