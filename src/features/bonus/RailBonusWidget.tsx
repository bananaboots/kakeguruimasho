/**
 * RailBonusWidget — desktop right-rail surface for the active bonus timer.
 *
 * Shares state with BonusTimerBanner via useBonusTimerSummary so both
 * surfaces show the same timer. Renders null when no active timer (the
 * RightRail collapses the empty section automatically).
 */
import { useNavigate } from 'react-router-dom';
import { useBonusTimerSummary } from './useBonusTimerSummary.ts';
import { BonusTimerCountdown } from './BonusTimerCountdown.tsx';
import { getAppStore, useAppStore } from '../../state/store.ts';

export function RailBonusWidget() {
  const navigate = useNavigate();
  const { oldest, originHabit, activeCount } = useBonusTimerSummary();
  const activeJarId = useAppStore((s) => s.activeJarId);

  if (!oldest) return null;

  const onExpire = () => {
    getAppStore().getState().actions.expireBonusTimer(activeJarId, oldest.id);
  };

  return (
    <button
      type="button"
      className="rail-bonus"
      onClick={() => navigate('/bonus')}
      aria-label={`Bonus timer active: ${oldest.percent}% on ${originHabit?.name ?? 'pick a habit'}.`}
    >
      <span className="rail-bonus__title">時 · Bonus</span>
      <span className="rail-bonus__badge">{oldest.percent}%</span>
      <BonusTimerCountdown
        endTimestamp={oldest.endTimestamp}
        onExpire={onExpire}
        compact
        className="rail-bonus__countdown"
      />
      <span className="rail-bonus__habit">
        {originHabit?.name ?? 'pick a habit'}
      </span>
      {activeCount > 1 && (
        <span className="rail-bonus__more">+{activeCount - 1} more</span>
      )}
    </button>
  );
}
