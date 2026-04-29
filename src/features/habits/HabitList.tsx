/**
 * HabitList — vertical list of active (non-archived) habits (3D).
 *
 * Each row renders:
 *   - habit name + unit summary
 *   - <QuickLogButton> primary CTA
 *   - edit / archive affordance
 *
 * Mobile-first: vertical stack, ≥ 44pt rows, primary button on the right
 * within thumb reach of the usual right-hand grip.
 */

import { useCallback, useState } from 'react';
import { Button } from '../../ui/button.tsx';
import { useAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';
import { RitualCard } from './RitualCard.tsx';
import { HabitEditor } from './HabitEditor.tsx';

export interface HabitListProps {
  /**
   * When supplied, bundle habits dispatch to this callback instead of
   * no-op'ing (used by /habits route where the bundle UI renders inline
   * below the list).
   */
  onBundleTap?: (habit: Habit) => void;
  /** Expose the Add button? Default: true. */
  showAdd?: boolean;
  /** Render each card in single-line compact mode. */
  compact?: boolean;
  /** Show the leading habit icon. Default true. */
  showIcon?: boolean;
}

export function HabitList({
  onBundleTap,
  showAdd = true,
  compact = false,
  showIcon = true,
}: HabitListProps) {
  const allHabits = useAppStore((s) => s.habits);
  const habits = allHabits.filter((h) => !h.archived);

  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);

  const closeEditor = useCallback(() => {
    setEditing(null);
    setCreating(false);
  }, []);

  return (
    <div className="habit-list" data-testid="habit-list">
      {showAdd ? (
        <div className="habit-list__toolbar">
          <Button
            variant="secondary"
            onClick={() => setCreating(true)}
            data-testid="habit-list-add"
          >
            + Add habit
          </Button>
        </div>
      ) : null}

      <ul className="habit-list__items" role="list">
        {habits.map((habit) => (
          <li key={habit.id} className="habit-list__item">
            <RitualCard
              habit={habit}
              {...(onBundleTap ? { onBundleTap } : {})}
              onEdit={setEditing}
              compact={compact}
              showIcon={showIcon}
            />
          </li>
        ))}
      </ul>

      {habits.length === 0 ? (
        <p className="habit-list__empty">
          No active habits. Add one to start earning clips.
        </p>
      ) : null}

      {editing || creating ? (
        <HabitEditor
          habit={editing}
          open
          onClose={closeEditor}
        />
      ) : null}
    </div>
  );
}
