/**
 * RecentPulls — last 5 main_spin events as a compact ledger.
 *
 * Lives in the right rail at desktop. Reads from the same in-memory
 * history slice ActivityFeed uses; filters to main_spin and shows the
 * top 5 newest-first.
 */
import { useMemo } from 'react';
import { useAppStore } from '../../state/store.ts';
import type { MainSpinEvent } from '../../types/history.ts';

export function RecentPulls() {
  const history = useAppStore((s) => s.history);

  const recent = useMemo<MainSpinEvent[]>(() => {
    const spins = (history ?? []).filter(
      (e): e is MainSpinEvent => e.kind === 'main_spin',
    );
    // History is appended chronologically; reverse for newest-first.
    return spins.slice(-5).reverse();
  }, [history]);

  return (
    <div className="recent-pulls">
      <div className="recent-pulls__title">最近 · Recent Pulls</div>
      {recent.length === 0 ? (
        <p className="recent-pulls__empty">No pulls yet.</p>
      ) : (
        <ul className="recent-pulls__list" aria-label="Recent pulls">
          {recent.map((ev) => (
            <li key={ev.id} className="recent-pulls__row">
              <span
                className="recent-pulls__tier"
                data-tier={ev.unlockedTier ?? 'T1'}
              >
                {ev.unlockedTier ?? 'T1'}
              </span>
              <span className="recent-pulls__landed">
                landed {ev.result.tier}
              </span>
              <span className="recent-pulls__time">{relativeTime(ev.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
