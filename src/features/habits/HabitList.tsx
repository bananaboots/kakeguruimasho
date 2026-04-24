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
import { QuickLogButton } from './QuickLogButton.tsx';
import { HabitEditor } from './HabitEditor.tsx';

function unitSummary(habit: Habit): string {
  switch (habit.unit.kind) {
    case 'count':
      return `${habit.unit.target} ${habit.unit.unit}`;
    case 'minutes':
      return `${habit.unit.target} min`;
    case 'sets':
      return `${habit.unit.target} sets`;
    case 'bundle':
      return `${habit.unit.subItems.length} sub-items · by ${habit.unit.cutoffLocal}`;
  }
}

export interface HabitListProps {
  /**
   * When supplied, bundle habits dispatch to this callback instead of
   * no-op'ing (used by /habits route where the bundle UI renders inline
   * below the list).
   */
  onBundleTap?: (habit: Habit) => void;
  /** Expose the Add button? Default: true. */
  showAdd?: boolean;
}

export function HabitList({ onBundleTap, showAdd = true }: HabitListProps) {
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
            <div className="habit-list__meta">
              <p className="habit-list__name">{habit.name}</p>
              <p className="habit-list__unit">{unitSummary(habit)}</p>
            </div>
            <div className="habit-list__actions">
              <QuickLogButton
                habit={habit}
                {...(onBundleTap ? { onBundleTap } : {})}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(habit)}
                aria-label={`Edit ${habit.name}`}
              >
                Edit
              </Button>
            </div>
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
