/**
 * BonusTimerDetail — `/bonus` deep view for active timers (3H).
 *
 * Mounts one card per active timer with:
 *   - <BonusTimerCountdown> — authoritative countdown
 *   - <DiscountHabitPicker> — pick a habit for the discount (per-timer, A3)
 *                             — internally swaps to <JustALittleBitMore>
 *                             once a habit is picked
 *
 * A3: multiple concurrent timers render concurrently. FREE segments don't
 * spawn timers (3A skips them), so we never render a FREE card here.
 *
 * Empty state: if no active timers (user navigated directly or all just
 * expired), show a muted "no active bonuses" message with a back link.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppStore, useAppStore } from '../state/store.ts';
import {
  BonusTimerCountdown,
  DiscountHabitPicker,
} from '../features/bonus/index.ts';
import type { BonusTimer } from '../types/bonus.ts';

function TimerCard({ timer }: { timer: BonusTimer }) {
  const activeJarId = useAppStore((s) => s.activeJarId);

  const onExpire = () => {
    getAppStore().getState().actions.expireBonusTimer(activeJarId, timer.id);
  };

  return (
    <article
      className="bonus-detail__timer-card"
      data-testid={`bonus-timer-card-${timer.id}`}
    >
      <header className="bonus-detail__timer-header">
        <h2 className="bonus-detail__timer-title">
          {timer.percent}% discount
        </h2>
        <BonusTimerCountdown
          endTimestamp={timer.endTimestamp}
          onExpire={onExpire}
        />
      </header>
      <p className="bonus-detail__timer-sub">
        Complete a discounted habit in 10 minutes to earn a clip.
      </p>
      <DiscountHabitPicker timer={timer} />
    </article>
  );
}

export default function BonusTimerDetail() {
  const navigate = useNavigate();
  // Subscribe to the stable array ref, filter in component to avoid a fresh
  // array on every render (Zustand re-render loop otherwise).
  const rawTimers = useAppStore(
    (s) => s.bonusTimerState[s.activeJarId]?.timers,
  );
  const timers = useMemo<BonusTimer[]>(
    () => (rawTimers ?? []).filter((t) => t.status === 'active'),
    [rawTimers],
  );

  return (
    <section className="route" aria-labelledby="bonus-title">
      <header className="route__header">
        <h1 id="bonus-title" className="route__title">
          Bonus timer
        </h1>
      </header>
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
