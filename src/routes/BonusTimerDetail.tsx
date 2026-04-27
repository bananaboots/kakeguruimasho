/**
 * BonusTimerDetail — `/bonus` deep view for active timers (3H).
 *
 * Wears the Vintage Pachinko parlour chassis (masthead, paper grain, motif).
 * Each active timer renders as a lacquer cabinet card with an hourglass
 * glyph, a gold-glow mono countdown, and a gold-gradient time bar showing
 * percent of the original 10-minute window remaining. The discount-habit
 * picker switches to a 2-up grid with ritual glyphs.
 *
 * A3: multiple concurrent timers render concurrently. FREE segments don't
 * spawn timers (3A skips them), so we never render a FREE card here.
 *
 * Source design: `pachinko-screens.jsx:859`.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppStore, useAppStore } from '../state/store.ts';
import {
  BonusTimerCountdown,
  DiscountHabitPicker,
} from '../features/bonus/index.ts';
import { useTheme } from '../styles/theme-context.ts';
import {
  DecoDivider,
  Engraved,
  Label,
  Masthead,
  Motif,
  RitualGlyph,
} from '../ui/parlour/index.ts';
import type { BonusTimer } from '../types/bonus.ts';

function ratioRemaining(timer: BonusTimer): number {
  const start = Date.parse(timer.spawnedAt);
  const end = Date.parse(timer.endTimestamp);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const total = end - start;
  const remaining = Math.max(0, end - Date.now());
  return Math.min(1, Math.max(0, remaining / total));
}

function TimerCard({ timer }: { timer: BonusTimer }) {
  const activeJarId = useAppStore((s) => s.activeJarId);

  const onExpire = () => {
    getAppStore().getState().actions.expireBonusTimer(activeJarId, timer.id);
  };

  const ratio = ratioRemaining(timer);

  return (
    <article
      className="bonus-cabinet"
      data-testid={`bonus-timer-card-${timer.id}`}
    >
      <div className="bonus-cabinet__header">
        <div className="bonus-cabinet__remaining">
          <RitualGlyph kind="hourglass" size={32} color="var(--color-gold)" />
          <div>
            <Label size={8}>残り · Remaining</Label>
            <BonusTimerCountdown
              endTimestamp={timer.endTimestamp}
              onExpire={onExpire}
              className="bonus-cabinet__countdown"
            />
          </div>
        </div>
        <div className="bonus-cabinet__landed">
          <Label size={8}>Landed On</Label>
          <Engraved size={20} align="right">
            {timer.percent}%
          </Engraved>
          <Label size={8} style={{ marginTop: 2 }}>
            {timer.percent === 75
              ? 'Three-quarter rep = +1 ball'
              : timer.percent === 50
                ? 'Half rep = +1 ball'
                : 'Quarter rep = +1 ball'}
          </Label>
        </div>
      </div>
      <div className="bonus-cabinet__bar" aria-hidden>
        <div
          className="bonus-cabinet__bar-fill"
          style={{ width: `${(ratio * 100).toFixed(2)}%` }}
        />
      </div>
      <div className="bonus-cabinet__picker">
        <div className="bonus-cabinet__picker-title">
          <Engraved size={16} align="left">
            択 · Discount a Ritual
          </Engraved>
        </div>
        <DiscountHabitPicker timer={timer} />
      </div>
    </article>
  );
}

export default function BonusTimerDetail() {
  const navigate = useNavigate();
  const { themeMeta } = useTheme();
  const rawTimers = useAppStore(
    (s) => s.bonusTimerState[s.activeJarId]?.timers,
  );
  const timers = useMemo<BonusTimer[]>(
    () => (rawTimers ?? []).filter((t) => t.status === 'active'),
    [rawTimers],
  );

  return (
    <section
      className="route route--bonus parlour-grain parlour-halftone"
      aria-labelledby="bonus-title"
    >
      <Masthead>
        <div className="parlour-masthead__kicker">
          Side Wheel · Time Pressure
        </div>
        <h1 id="bonus-title" className="parlour-masthead__title">
          The Second Chance
        </h1>
        <p className="parlour-masthead__tagline">{themeMeta.tagline}</p>
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

      {timers.length === 0 ? (
        <div className="bonus-detail__empty" data-testid="bonus-detail-empty">
          <p>No active bonuses.</p>
          <button
            type="button"
            className="bonus-detail__empty-link"
            onClick={() => navigate('/')}
          >
            Back home
          </button>
        </div>
      ) : (
        <div className="bonus-detail">
          {timers.map((t) => (
            <TimerCard key={t.id} timer={t} />
          ))}
        </div>
      )}
    </section>
  );
}
