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

import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from '../state/store.ts';
import { HygieneBundle, RitualCard } from '../features/habits/index.ts';
import {
  ActivityFeed,
  Streak,
  PotMini,
} from '../features/jar/index.ts';
import { HandTrayCard } from '../features/spin/index.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Masthead, Motif, SectionTitle } from '../ui/parlour/index.ts';
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
  const { themeMeta } = useTheme();

  return (
    <section
      className="route route--home parlour-grain parlour-halftone"
      aria-labelledby="home-title"
    >
      <Masthead>
        <Link
          to="/settings"
          className="parlour-masthead__cog"
          aria-label="Settings"
        >
          <SettingsIcon size={20} aria-hidden="true" />
        </Link>
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
      </Masthead>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <Streak jarId={activeJarId} />

      <HandTrayCard jarId={activeJarId} />

      <SectionTitle
        jp="行"
        en="Rituals · Tap to Log"
        style={{ marginTop: 'var(--space-5)' }}
      />
      <div className="quicklog-grid" role="group" aria-label="Quick log">
        {habits.map((habit) => (
          <RitualCard key={habit.id} habit={habit} />
        ))}
      </div>

      {selfCare ? <HygieneBundle habit={selfCare} jarId={activeJarId} /> : null}

      <DecoDivider style={{ margin: 'var(--space-5) 0' }} />

      {/* The desktop right rail surfaces PotMini; hide the inline
          copy at >=1024px so it isn't doubled. */}
      <div className="home__pot-inline">
        <PotMini jarId={activeJarId} />
      </div>

      <ActivityFeed jarId={activeJarId} days={7} limit={50} />
    </section>
  );
}
