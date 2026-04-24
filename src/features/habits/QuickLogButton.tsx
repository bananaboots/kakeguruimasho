/**
 * QuickLogButton — primary "I did the habit" CTA (3D).
 *
 * Behavior by unit kind:
 *  - `count`   → opens <StepEntry> for batched `floor(n/target)` awards
 *  - `minutes` → single-tap earns 1 clip (via `actions.completeHabit(id, 1)`)
 *  - `sets`    → single-tap earns 1 clip
 *  - `bundle`  → navigates to the /habits route where <HygieneBundle> lives
 *    (or parent can inline the bundle; this component's bundle branch opens
 *    a sibling modal / scrolls into view — kept simple here by no-op so the
 *    bundle's own UI is the primary surface)
 *
 * A11y: ≥ 44pt tap, `aria-live="polite"` announcement on clip earn.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../ui/button.tsx';
import { getAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';
import { StepEntry } from './StepEntry.tsx';

export interface QuickLogButtonProps {
  habit: Habit;
  /** Optional click override — Home uses default; Habits route can supply scroll-to-bundle. */
  onBundleTap?: (habit: Habit) => void;
}

export function QuickLogButton({ habit, onBundleTap }: QuickLogButtonProps) {
  const [stepOpen, setStepOpen] = useState(false);
  const [lastEarned, setLastEarned] = useState<number | null>(null);

  // Clear the announcement after a moment so SRs don't re-announce on re-render.
  useEffect(() => {
    if (lastEarned === null) return;
    const id = window.setTimeout(() => setLastEarned(null), 1500);
    return () => window.clearTimeout(id);
  }, [lastEarned]);

  const logOne = useCallback(() => {
    const { actions } = getAppStore().getState();
    const result = actions.completeHabit(habit.id, 1);
    setLastEarned(result.clipsEarned);
  }, [habit.id]);

  const handleClick = useCallback(() => {
    switch (habit.unit.kind) {
      case 'count':
        setStepOpen(true);
        return;
      case 'minutes':
      case 'sets':
        logOne();
        return;
      case 'bundle':
        onBundleTap?.(habit);
        return;
    }
  }, [habit, logOne, onBundleTap]);

  const label = (() => {
    switch (habit.unit.kind) {
      case 'count':
        return `Log ${habit.name}`;
      case 'minutes':
        return `Log ${habit.unit.target} min ${habit.name.toLowerCase()}`;
      case 'sets':
        return `Log ${habit.unit.target} sets — ${habit.name}`;
      case 'bundle':
        return `Open ${habit.name}`;
    }
  })();

  return (
    <>
      <Button
        variant="primary"
        size="lg"
        onClick={handleClick}
        className="quicklog"
        aria-label={label}
        data-testid={`quicklog-${habit.id}`}
      >
        {label}
      </Button>
      <span className="sr-only" aria-live="polite" role="status">
        {lastEarned !== null
          ? `Earned ${lastEarned} clip${lastEarned === 1 ? '' : 's'}.`
          : ''}
      </span>
      {habit.unit.kind === 'count' ? (
        <StepEntry
          habit={habit}
          open={stepOpen}
          onClose={() => setStepOpen(false)}
        />
      ) : null}
    </>
  );
}
