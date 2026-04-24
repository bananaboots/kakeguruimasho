/**
 * Habits — full habit management screen (3D mounts here).
 *
 * ARCHITECTURE §6 / §7D: HabitList (with an Add button), HabitEditor modal,
 * and HygieneBundle for the default hygiene habit.
 */

import { useAppStore } from '../state/store.ts';
import { HabitList, HygieneBundle } from '../features/habits/index.ts';
import { DEFAULT_HABIT_IDS } from '../data/defaults.ts';

export default function Habits() {
  const allHabits = useAppStore((s) => s.habits);
  const hygiene = allHabits.find(
    (h) => h.id === DEFAULT_HABIT_IDS.hygiene && !h.archived,
  );

  return (
    <section className="route" aria-labelledby="habits-title">
      <header className="route__header">
        <h1 id="habits-title" className="route__title">
          Habits
        </h1>
      </header>
      <div className="slot" data-slot="[3D] HabitList">
        <HabitList />
      </div>
      <div className="slot" data-slot="[3D] HygieneBundle">
        {hygiene ? (
          <HygieneBundle habit={hygiene} />
        ) : (
          <p className="route__subtitle">
            Hygiene bundle archived — recreate via Add habit (kind: bundle).
          </p>
        )}
      </div>
    </section>
  );
}
