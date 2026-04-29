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
import { HygieneBundle, RitualCard } from '../features/habits/index.ts';
import {
  ActivityFeed,
  Streak,
  PotMini,
} from '../features/jar/index.ts';
import { HandTrayCard } from '../features/spin/index.ts';
import { RouteHeader, SectionTitle } from '../ui/parlour/index.ts';
import { DEFAULT_HABIT_IDS } from '../data/defaults.ts';

export default function Home() {
  const allHabits = useAppStore((s) => s.habits);
  const activeJarId = useAppStore((s) => s.activeJarId);
  const habits = allHabits.filter(
    (h) => !h.archived && h.id !== DEFAULT_HABIT_IDS.hygiene,
  );
  const selfCare = allHabits.find(
    (h) => h.id === DEFAULT_HABIT_IDS.hygiene && !h.archived,
  );

  return (
    <section
      className="route route--home parlour-grain parlour-halftone"
      aria-labelledby="home-title"
    >
      <RouteHeader title="Salon" titleId="home-title" />

      <HandTrayCard jarId={activeJarId} />

      <SectionTitle
        jp="行"
        en="Rituals · Tap to Log"
        style={{ marginTop: 'var(--space-4)' }}
      />

      {/* Bundles take a full row each, so they live above the 2-col grid of
          single-tap habits. */}
      {selfCare ? (
        <div className="home__bundle-stack">
          <HygieneBundle habit={selfCare} jarId={activeJarId} />
        </div>
      ) : null}

      <div className="quicklog-grid" role="group" aria-label="Quick log">
        {habits.map((habit) => (
          <RitualCard key={habit.id} habit={habit} />
        ))}
      </div>

      {/* The desktop right rail surfaces PotMini; hide the inline
          copy at >=1024px so it isn't doubled. */}
      <div className="home__pot-inline">
        <PotMini jarId={activeJarId} />
      </div>

      <ActivityFeed jarId={activeJarId} days={7} limit={50} />

      <Streak jarId={activeJarId} />
    </section>
  );
}
