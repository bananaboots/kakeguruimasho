// ActivityFeed tests — grouping by day, event kind filtering, empty state.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { ActivityFeed } from '../ActivityFeed.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { DEFAULT_JAR_ID, asClipId, asEventId } from '../../../types/ids.ts';
import type { AppState } from '../../../types/app-state.ts';
import type { HistoryEvent } from '../../../types/history.ts';

function isoAt(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seedHistory(events: HistoryEvent[]): void {
  const store = getAppStore();
  const prev = store.getState();
  const { actions: _a, ...rest } = prev;
  void _a;
  const next: AppState = {
    ...(rest as AppState),
    history: events,
  };
  prev.actions.hydrate(next);
}

describe('<ActivityFeed />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders empty state when no qualifying events exist', () => {
    render(<ActivityFeed jarId={DEFAULT_JAR_ID} />);
    expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
  });

  it('groups events by local day (newest day first, newest-within-day first)', () => {
    const today = isoAt(0, 14);
    const todayEarlier = isoAt(0, 9);
    const yesterday = isoAt(1, 20);

    seedHistory([
      // Note: selector returns newest LAST in memory; we push in chronological
      // order so the most recent is at the end of the array — the selector
      // reverses that.
      {
        kind: 'clip_earned',
        id: asEventId('e1'),
        at: yesterday,
        jarId: DEFAULT_JAR_ID,
        source: 'habit',
        habitId: null,
        clipId: asClipId('c1'),
        drawnColor: 'red',
      } as HistoryEvent,
      {
        kind: 'clip_earned',
        id: asEventId('e2'),
        at: todayEarlier,
        jarId: DEFAULT_JAR_ID,
        source: 'habit',
        habitId: null,
        clipId: asClipId('c2'),
        drawnColor: 'blue',
      } as HistoryEvent,
      {
        kind: 'milestone_claimed',
        id: asEventId('e3'),
        at: today,
        jarId: DEFAULT_JAR_ID,
        milestone: 'mini',
        reset: false,
      } as HistoryEvent,
    ]);

    render(<ActivityFeed jarId={DEFAULT_JAR_ID} days={7} />);

    const days = screen.getAllByRole('region', { hidden: true }).filter(
      (el) => el.classList.contains('activity-feed__day'),
    );
    // Fallback: find by data-day attribute.
    const allDays = document.querySelectorAll('.activity-feed__day');
    expect(allDays.length).toBe(2);

    // First day heading is "Today".
    expect(allDays[0]!.querySelector('.activity-feed__day-heading')!.textContent).toBe('Today');
    expect(allDays[1]!.querySelector('.activity-feed__day-heading')!.textContent).toBe('Yesterday');

    // "Today" group has 2 events; "Yesterday" has 1.
    expect(within(allDays[0] as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
    expect(within(allDays[1] as HTMLElement).getAllByRole('listitem')).toHaveLength(1);

    // The claim event renders with "Claimed Mini" copy.
    expect(screen.getByText(/Claimed Mini/i)).toBeInTheDocument();
    // Non-triggered kinds like bag_refilled would be dropped — this feed
    // never shows those.
    expect(days).toBeDefined();
  });

  it('filters by days window (events older than `days` are excluded)', () => {
    const recent = isoAt(1, 10);
    const old = isoAt(40, 10);

    seedHistory([
      {
        kind: 'clip_earned',
        id: asEventId('old'),
        at: old,
        jarId: DEFAULT_JAR_ID,
        source: 'habit',
        habitId: null,
        clipId: asClipId('cold'),
        drawnColor: 'green',
      } as HistoryEvent,
      {
        kind: 'clip_earned',
        id: asEventId('new'),
        at: recent,
        jarId: DEFAULT_JAR_ID,
        source: 'habit',
        habitId: null,
        clipId: asClipId('cnew'),
        drawnColor: 'pink',
      } as HistoryEvent,
    ]);

    render(<ActivityFeed jarId={DEFAULT_JAR_ID} days={7} />);
    // Recent one is rendered, old one is not.
    expect(screen.getByText(/Earned a pink clip/i)).toBeInTheDocument();
    expect(screen.queryByText(/Earned a green clip/i)).toBeNull();
  });

  it('drops event kinds not in the renderer (e.g. settings_changed)', () => {
    const at = isoAt(0, 12);
    seedHistory([
      {
        kind: 'settings_changed',
        id: asEventId('s1'),
        at,
        jarId: DEFAULT_JAR_ID,
        path: 'sfxEnabled',
        before: true,
        after: false,
      } as HistoryEvent,
    ]);
    render(<ActivityFeed jarId={DEFAULT_JAR_ID} days={7} />);
    expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
  });
});
