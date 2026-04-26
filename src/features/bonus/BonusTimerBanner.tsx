/**
 * BonusTimerBanner — sticky cross-route banner (3H).
 *
 * Replaces `BonusTimerBannerStub` (3J). Visible from any route when
 * `selectActiveBonusTimers(jarId).length > 0`. Per §7H and A3, the banner
 * surfaces the *oldest-spawned* active timer (so the user sees the one
 * closest to expiring first when concurrent timers exist), with a
 * `+N more` chip showing additional concurrent timers. Tap navigates to
 * `/bonus`.
 *
 * Expiration is handled passively: when the countdown crosses 0, we call
 * `actions.expireBonusTimer` directly. This covers the normal
 * foreground-visible case; `expireCheck.ts` handles all other cases
 * (app reopen, backgrounded tab).
 *
 * Implementation note: we subscribe to the stable `timers` array reference
 * (owned by the bonus slice) and derive the `active` list via `useMemo` to
 * avoid returning a freshly-filtered array from the selector on every
 * render (which would cause Zustand to re-render in a loop).
 */

import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAppStore, useAppStore } from '../../state/store.ts';
import type { BonusTimer } from '../../types/bonus.ts';
import type { Habit } from '../../types/habit.ts';
import { BonusTimerCountdown } from './BonusTimerCountdown.tsx';
import { useBonusTimerSummary } from './useBonusTimerSummary.ts';

function bannerSegmentLabel(timer: BonusTimer): string {
  return `${timer.percent}%`;
}

function habitLabel(habit: Habit | undefined | null): string {
  if (!habit) return 'pick a habit';
  return habit.name;
}

export function BonusTimerBanner() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeJarId = useAppStore((s) => s.activeJarId);
  const { oldest, originHabit, activeCount } = useBonusTimerSummary();

  const onExpire = useCallback(() => {
    if (!oldest) return;
    getAppStore().getState().actions.expireBonusTimer(activeJarId, oldest.id);
  }, [oldest, activeJarId]);

  const onTap = useCallback(() => {
    if (location.pathname === '/bonus') return;
    navigate('/bonus');
  }, [navigate, location.pathname]);

  if (!oldest) return null;

  const moreCount = activeCount - 1;

  return (
    <button
      type="button"
      className="bonus-banner"
      onClick={onTap}
      data-testid="bonus-banner"
      aria-label={`Bonus timer active: ${bannerSegmentLabel(oldest)} on ${habitLabel(
        originHabit,
      )}. Tap to view.`}
    >
      <span className="bonus-banner__badge">{bannerSegmentLabel(oldest)}</span>
      <BonusTimerCountdown
        endTimestamp={oldest.endTimestamp}
        onExpire={onExpire}
        compact
        className="bonus-banner__countdown"
      />
      <span className="bonus-banner__habit">
        {originHabit ? originHabit.name : 'pick a habit'}
      </span>
      {moreCount > 0 ? (
        <span
          className="bonus-banner__more"
          data-testid="bonus-banner-more"
        >
          +{moreCount} more
        </span>
      ) : null}
    </button>
  );
}
