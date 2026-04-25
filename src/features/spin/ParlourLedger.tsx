import { useAppStore } from '../../state/store.ts';
import { selectJarTotal } from '../../state/selectors.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import type { JarId } from '../../types/ids.ts';
import type { MainWheelTier } from '../../types/wheel.ts';

const TIER_GLYPH: Record<MainWheelTier, string> = {
  T1: '一',
  T2: '二',
  T3: '三',
  BONUS: '副',
  JACKPOT: '★',
};

const TIER_SUB: Record<MainWheelTier, string> = {
  T1: 'tier I',
  T2: 'tier II',
  T3: 'tier III',
  BONUS: 'bonus',
  JACKPOT: 'jackpot',
};

function relativeAge(timestamp: string): string {
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export type ParlourLedgerProps = {
  jarId?: JarId;
};

export function ParlourLedger({ jarId = DEFAULT_JAR_ID }: ParlourLedgerProps) {
  const dailyStreak = useAppStore((s) => s.streaks[jarId]?.daily.current ?? 0);
  const total = useAppStore((s) => selectJarTotal(s, jarId));
  const lastSpin = useAppStore((s) => {
    for (let i = s.history.length - 1; i >= 0; i -= 1) {
      const ev = s.history[i];
      if (ev?.kind === 'main_spin' && ev.jarId === jarId) {
        return { tier: ev.result.tier, ts: ev.at };
      }
    }
    return null;
  });

  const lastPullValue = lastSpin ? TIER_GLYPH[lastSpin.tier] : '—';
  const lastPullSub = lastSpin
    ? `${TIER_SUB[lastSpin.tier]} · ${relativeAge(lastSpin.ts)}`
    : 'awaiting first pull';

  const cells = [
    { k: 'Streak', v: String(dailyStreak), sub: '日 days' },
    { k: 'Pot', v: `$${total}`, sub: '壺 jar' },
    { k: 'Last Pull', v: lastPullValue, sub: lastPullSub },
  ] as const;

  return (
    <div
      className="parlour-ledger"
      role="group"
      aria-label="Parlour ledger"
    >
      {cells.map((cell, i) => (
        <div
          key={cell.k}
          className="parlour-ledger__cell"
          data-first={i === 0 || undefined}
        >
          <div className="parlour-ledger__key">{cell.k}</div>
          <div className="parlour-ledger__value">{cell.v}</div>
          <div className="parlour-ledger__sub">{cell.sub}</div>
        </div>
      ))}
    </div>
  );
}
