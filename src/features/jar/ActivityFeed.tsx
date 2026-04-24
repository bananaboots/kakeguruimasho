/**
 * ActivityFeed — chronological history grouped by local day.
 *
 * Default: last 7 days of events. `limit={Infinity}` shows everything in
 * the in-memory window (the store keeps 500 events in memory; full-lifetime
 * feed reads from IDB directly via a separate flow not wired here yet).
 *
 * Event kinds rendered:
 *  - clip_earned
 *  - milestone_unlocked
 *  - milestone_claimed
 *  - main_spin (tier + reward selected)
 *  - bonus_completed
 *  - streak_broken
 *  - near_miss (subtle)
 *  - jar_reset
 *
 * Other event kinds are dropped silently so the feed stays readable.
 */

import { useMemo, useState, type ReactElement } from 'react';
import {
  Coins,
  Award,
  Gift,
  Dice5,
  Timer,
  Flame,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '../../state/store.ts';
import type { JarId } from '../../types/ids.ts';
import type { HistoryEvent } from '../../types/history.ts';

type IconCmp = React.ComponentType<
  React.SVGProps<SVGSVGElement> & { size?: number | string }
>;

export interface ActivityFeedProps {
  jarId?: JarId;
  /** How many days back to show (based on event's local date). Default 7. */
  days?: number;
  /** Maximum events to read from the in-memory window. Default 200. */
  limit?: number;
  /** If true, only subtle near-miss events are included. Default: all kinds. */
  subtleOnly?: boolean;
}

const RENDERED_KINDS = new Set<HistoryEvent['kind']>([
  'clip_earned',
  'milestone_unlocked',
  'milestone_claimed',
  'main_spin',
  'bonus_completed',
  'streak_broken',
  'near_miss',
  'jar_reset',
]);

interface FeedRow {
  evt: HistoryEvent;
  day: string; // YYYY-MM-DD local
  time: string; // HH:MM local
  icon: IconCmp;
  subtle: boolean;
  text: string;
}

export function ActivityFeed({
  jarId,
  days = 7,
  limit = 200,
}: ActivityFeedProps): ReactElement {
  // Subscribe to the raw history array (reference-stable until it mutates)
  // rather than piping through `selectRecentHistory`, which would return a
  // fresh array on every render and trip Zustand 5's snapshot guard.
  const history = useAppStore((s) => s.history);
  const pulledLimit = Number.isFinite(limit) ? (limit as number) : 500;

  // Snapshot "now" once per mount — used for the `days` cutoff. Lazy-state
  // init defers the impure Date.now() call to before first render so it
  // doesn't run as part of render itself (react-hooks/purity). The feed is a
  // read-only view so a mount-time cutoff is acceptable.
  const [nowMs] = useState<number>(() => Date.now());

  const rows = useMemo<FeedRow[]>(() => {
    // Take the latest `pulledLimit` events, newest-first.
    const n = Math.max(0, Math.min(pulledLimit, history.length));
    const slice: HistoryEvent[] = [];
    for (let i = history.length - 1; i >= history.length - n; i--) {
      slice.push(history[i]!);
    }
    const cutoffDays = Number.isFinite(days) ? days : Infinity;
    const cutoffMs = nowMs - cutoffDays * 24 * 60 * 60 * 1000;

    const out: FeedRow[] = [];
    for (const evt of slice) {
      if (!RENDERED_KINDS.has(evt.kind)) continue;
      if (jarId && evt.jarId !== jarId) continue;
      const ts = Date.parse(evt.at);
      if (Number.isFinite(ts) && ts < cutoffMs) continue;

      const d = new Date(evt.at);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      const meta = describe(evt);
      if (!meta) continue;
      out.push({ evt, day, time, ...meta });
    }
    return out;
  }, [history, pulledLimit, days, jarId, nowMs]);

  // Group consecutive rows by day (they arrive newest-first from the selector).
  const grouped = useMemo(() => {
    const groups: { day: string; rows: FeedRow[] }[] = [];
    for (const r of rows) {
      const tail = groups[groups.length - 1];
      if (tail && tail.day === r.day) tail.rows.push(r);
      else groups.push({ day: r.day, rows: [r] });
    }
    return groups;
  }, [rows]);

  if (grouped.length === 0) {
    return (
      <div className="activity-feed" data-testid="activity-feed">
        <p className="activity-feed__empty">No events yet.</p>
      </div>
    );
  }

  return (
    <div className="activity-feed" data-testid="activity-feed">
      {grouped.map((group) => (
        <section
          key={group.day}
          className="activity-feed__day"
          data-day={group.day}
          aria-label={formatDayHeading(group.day)}
        >
          <h3 className="activity-feed__day-heading">
            {formatDayHeading(group.day)}
          </h3>
          <ul className="activity-feed__list">
            {group.rows.map((r) => (
              <li
                key={r.evt.id}
                className={`activity-feed__item ${r.subtle ? 'activity-feed__item--subtle' : ''}`}
                data-kind={r.evt.kind}
              >
                <span className="activity-feed__item-icon" aria-hidden="true">
                  <r.icon size={16} />
                </span>
                <span className="activity-feed__item-text">{r.text}</span>
                <span className="activity-feed__item-time">{r.time}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function describe(
  evt: HistoryEvent,
): { icon: IconCmp; subtle: boolean; text: string } | null {
  switch (evt.kind) {
    case 'clip_earned':
      return {
        icon: Coins as unknown as IconCmp,
        subtle: false,
        text: `Earned a ${evt.drawnColor} clip`,
      };
    case 'milestone_unlocked':
      return {
        icon: Award as unknown as IconCmp,
        subtle: false,
        text: `Milestone unlocked: ${prettyMilestone(evt.milestone)} ($${evt.total})`,
      };
    case 'milestone_claimed':
      return {
        icon: Gift as unknown as IconCmp,
        subtle: false,
        text: evt.reset
          ? `Claimed Moonshot — jar reset`
          : `Claimed ${prettyMilestone(evt.milestone)}`,
      };
    case 'main_spin': {
      const tier = evt.unlockedTier ?? 'T1';
      const reward = evt.rewardSelected ? ` — reward #${evt.rewardSelected.slice(-4)}` : '';
      return {
        icon: Dice5 as unknown as IconCmp,
        subtle: false,
        text: `Spin landed ${evt.result.tier}, unlocked ${tier}${reward}`,
      };
    }
    case 'bonus_completed':
      return {
        icon: Timer as unknown as IconCmp,
        subtle: false,
        text: `Bonus timer completed`,
      };
    case 'streak_broken':
      return {
        icon: Flame as unknown as IconCmp,
        subtle: false,
        text: `${prettyStreak(evt.streak)} streak broken at ${evt.lastValue}`,
      };
    case 'near_miss':
      return {
        icon: Sparkles as unknown as IconCmp,
        subtle: true,
        text: `Near-miss: rolled ${evt.actualTier}, needed ${evt.blockedBy} cash-in`,
      };
    case 'jar_reset':
      return {
        icon: RotateCcw as unknown as IconCmp,
        subtle: false,
        text: `Jar reset from $${evt.from}`,
      };
    default:
      return null;
  }
}

function prettyMilestone(id: string): string {
  if (id === 'mini' || id === 'mid' || id === 'moonshot') {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
  return 'Milestone';
}

function prettyStreak(kind: 'daily' | 'hygiene' | 'bonus-chain'): string {
  if (kind === 'bonus-chain') return 'Bonus chain';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function formatDayHeading(day: string): string {
  // day is YYYY-MM-DD in device-local TZ (constructed that way above).
  const parts = day.split('-');
  if (parts.length !== 3) return day;
  const [y, m, d] = parts.map((p) => Number(p));
  const date = new Date(y!, (m ?? 1) - 1, d!);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
