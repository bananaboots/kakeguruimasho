/**
 * Habits — full habit management screen (3D mounts here).
 *
 * ARCHITECTURE §6 / §7D: HabitList (with an Add button), HabitEditor modal,
 * and HygieneBundle for the default hygiene habit.
 */

import { useAppStore } from '../state/store.ts';
import { HabitList, HygieneBundle } from '../features/habits/index.ts';
import { DEFAULT_HABIT_IDS } from '../data/defaults.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Habits() {
  const allHabits = useAppStore((s) => s.habits);
  const hygiene = allHabits.find(
    (h) => h.id === DEFAULT_HABIT_IDS.hygiene && !h.archived,
  );
  const { themeMeta } = useTheme();

  return (
    <section
      className="route route--habits parlour-grain parlour-halftone"
      aria-labelledby="habits-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="habits-title" className="parlour-masthead__title">
          Rituals
        </h1>
        <p className="parlour-masthead__tagline">
          Each ritual kept earns a clip. Tap to log.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <HabitList />
      {hygiene ? (
        <HygieneBundle habit={hygiene} />
      ) : (
        <p className="route__subtitle">
          Hygiene bundle archived — recreate via Add habit (kind: bundle).
        </p>
      )}
    </section>
  );
}
