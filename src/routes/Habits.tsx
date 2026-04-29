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
    <section
      className="route route--habits parlour-grain parlour-halftone"
      aria-labelledby="habits-title"
    >
      <h1 id="habits-title" className="sr-only">
        Rituals
      </h1>

      <HabitList />
      {hygiene ? (
        <HygieneBundle habit={hygiene} />
      ) : (
        <p className="route__subtitle">
          Self care bundle archived — recreate via Add habit (kind: bundle).
        </p>
      )}
    </section>
  );
}
