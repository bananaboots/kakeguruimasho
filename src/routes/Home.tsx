/**
 * Home — landing screen skeleton (3J).
 *
 * ARCHITECTURE §6 component hierarchy: composes quick-log buttons [3D],
 * hand summary [3E], jar snippet + streak header + activity feed [3G].
 * Those mount into the slots below when Wave 2+ land.
 *
 * Wave 2 3D: fills `[3D] QuickLogButton *5` with a grid of QuickLogButtons
 * for every active (non-archived) habit.
 */

import { useAppStore } from '../state/store.ts';
import { QuickLogButton } from '../features/habits/index.ts';
import {
  JarVisual,
  StreakDisplay,
  ActivityFeed,
} from '../features/jar/index.ts';
import { HandSummary } from '../features/spin/index.ts';

export default function Home() {
  const allHabits = useAppStore((s) => s.habits);
  const activeJarId = useAppStore((s) => s.activeJarId);
  const habits = allHabits.filter((h) => !h.archived);

  return (
    <section className="route" aria-labelledby="home-title">
      <header className="route__header">
        <div>
          <h1 id="home-title" className="route__title">
            kakeguruimasho
          </h1>
          <p className="route__subtitle">
            Your slot-machine habit system. Log a habit to earn a paperclip.
          </p>
        </div>
      </header>

      <StreakDisplay jarId={activeJarId} />

      <div className="slot" data-slot="[3D] QuickLogButton *5">
        <div className="quicklog-grid" role="group" aria-label="Quick log">
          {habits.map((habit) => (
            <QuickLogButton key={habit.id} habit={habit} />
          ))}
        </div>
      </div>

      <HandSummary jarId={activeJarId} />

      <JarVisual jarId={activeJarId} condensed />

      <ActivityFeed jarId={activeJarId} days={7} limit={50} />
    </section>
  );
}
