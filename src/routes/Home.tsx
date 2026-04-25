/**
 * Home — Vintage Pachinko salon landing.
 *
 * The chassis (masthead + paper grain) is theme-driven; the inner
 * arrangement (streak chips, quick-log grid, hand summary, jar snippet,
 * activity feed) is unchanged so it continues to receive new tokens
 * via CSS variables.
 *
 * Wave 2 3D fills the QuickLog slot with one button per active habit.
 */

import { useAppStore } from '../state/store.ts';
import { QuickLogButton } from '../features/habits/index.ts';
import {
  JarVisual,
  StreakDisplay,
  ActivityFeed,
} from '../features/jar/index.ts';
import { HandSummary } from '../features/spin/index.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Home() {
  const allHabits = useAppStore((s) => s.habits);
  const activeJarId = useAppStore((s) => s.activeJarId);
  const habits = allHabits.filter((h) => !h.archived);
  const { themeMeta } = useTheme();

  return (
    <section
      className="route route--home parlour-grain parlour-halftone"
      aria-labelledby="home-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="home-title" className="parlour-masthead__title">
          {themeMeta.name}
        </h1>
        <p className="parlour-masthead__tagline">
          A clip earned for each ritual kept. Cash them in for a pull.
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

      <StreakDisplay jarId={activeJarId} />

      <div className="slot" data-slot="[3D] QuickLogButton *5">
        <div className="quicklog-grid" role="group" aria-label="Quick log">
          {habits.map((habit) => (
            <QuickLogButton key={habit.id} habit={habit} />
          ))}
        </div>
      </div>

      <HandSummary jarId={activeJarId} />

      <DecoDivider style={{ margin: 'var(--space-5) 0' }} />

      <JarVisual jarId={activeJarId} condensed />

      <ActivityFeed jarId={activeJarId} days={7} limit={50} />
    </section>
  );
}
