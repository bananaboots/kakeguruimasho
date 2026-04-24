/**
 * HygieneBundle — 4-checkbox compound habit UI (3D).
 *
 * SPEC §5.8, §6.1; DECISIONS Q5 (cutoff configurable, default 01:00); A5
 * (award immediately when all 4 done before cutoff; retroactive on next open
 * otherwise — handled in `checkRetroactiveHygiene.ts`).
 *
 * Behavior:
 * - Checking a subitem writes its timestamp into `pendingHygieneBundle`.
 * - Unchecking clears it.
 * - When all 4 are checked AND all timestamps are BEFORE cutoff → immediately
 *   call `actions.completeHabit(hygieneId, 1)` and flip `awarded: true` so
 *   the same bundle can't double-award.
 * - Past-cutoff: checkboxes are locked; user will have to wait for the next
 *   local-day rollover. (If they completed all 4 before cutoff but didn't
 *   check them before cutoff, they can still retro-mark next morning via
 *   `checkRetroactiveHygiene` — but the wall-clock rule is: `awarded` only
 *   fires when the LATEST subItemCompleted timestamp is before the cutoff.)
 *
 * A11y: each checkbox is a <label><input type="checkbox"></label>.
 * `aria-live="polite"` on the countdown line so screen readers get the
 * "bed by 01:00" nudge without constant verbosity.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAppStore, useAppStore } from '../../state/store.ts';
import { addDaysLocal, nowISO, parseLocalTime } from '../../lib/time.ts';
import type { Habit, HygieneBundleState } from '../../types/habit.ts';
import type { JarId, LocalDate } from '../../types/ids.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';

export interface HygieneBundleProps {
  habit: Habit; // must have unit.kind === 'bundle'
  /** Optional jar override; defaults to active jar (v1 = DEFAULT_JAR_ID). */
  jarId?: JarId;
}

/**
 * The "hygiene-day" for a given wall-clock moment is the calendar date of
 * the most recent cutoff that has already passed. E.g. with cutoff 01:00:
 *   - At 22:00 on day X → hygiene-day = X (cutoff of X-1→X already happened)
 *   - At 00:30 on day X → hygiene-day = X-1 (X's cutoff hasn't happened yet)
 *   - At 01:00 on day X → hygiene-day = X
 */
function hygieneDayOf(from: Date, cutoffLocal: string): LocalDate {
  const minutes = parseLocalTime(cutoffLocal);
  const nowMin = from.getHours() * 60 + from.getMinutes();
  const d = new Date(from);
  if (nowMin < minutes) {
    // Still inside the previous hygiene-day's overnight window.
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}` as LocalDate;
}


/**
 * Hygiene semantics: the bundle for `bundle.date` "closes" at `cutoffLocal`
 * on the FOLLOWING calendar day. A subitem completion at 22:45 on the same
 * date as `bundle.date` counts as before-cutoff; a completion at 02:00 on
 * `bundle.date + 1` does not.
 */
function deadlineFor(bundleDate: LocalDate, cutoffLocal: string): Date {
  const next = addDaysLocal(bundleDate, 1);
  const [y, m, d] = next.split('-').map(Number);
  const minutes = parseLocalTime(cutoffLocal);
  return new Date(y!, m! - 1, d!, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function allBeforeCutoff(
  bundle: HygieneBundleState,
  subItems: string[],
): boolean {
  const deadline = deadlineFor(bundle.date, bundle.cutoffLocal);
  for (const key of subItems) {
    const ts = bundle.subItemsCompleted[key];
    if (!ts) return false;
    if (new Date(ts).getTime() >= deadline.getTime()) return false;
  }
  return true;
}

/**
 * Minutes until the hygiene deadline for the current hygiene-day. Negative
 * after the deadline (shouldn't happen — UI rolls over to a new hygiene-day).
 */
function minutesUntilDeadline(cutoffHHMM: string, from: Date): number {
  const deadline = deadlineFor(hygieneDayOf(from, cutoffHHMM), cutoffHHMM);
  return Math.round((deadline.getTime() - from.getTime()) / 60_000);
}

function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function HygieneBundle({ habit, jarId = DEFAULT_JAR_ID }: HygieneBundleProps) {
  const subItems = useMemo(() => {
    if (habit.unit.kind !== 'bundle') return [] as string[];
    return habit.unit.subItems;
  }, [habit]);

  const cutoffLocal = useMemo(() => {
    if (habit.unit.kind !== 'bundle') return '01:00';
    return habit.unit.cutoffLocal;
  }, [habit]);

  const bundle = useAppStore((s) => s.pendingHygieneBundle[jarId] ?? null);

  // Live clock for the countdown line — tick once a minute.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // The hygiene-day is a cutoff-anchored window; the deadline is tomorrow @
  // cutoff. There is no "past cutoff locked" state in v1 — if the user misses,
  // `checkRetroactiveHygiene` resets the bundle on next app open.
  const hygieneDay = hygieneDayOf(now, cutoffLocal);
  const deadline = deadlineFor(hygieneDay, cutoffLocal);
  const pastCutoff = now.getTime() >= deadline.getTime(); // pathological edge only
  const minsLeft = minutesUntilDeadline(cutoffLocal, now);

  const checkedKeys = useMemo(() => {
    const out = new Set<string>();
    if (!bundle) return out;
    for (const k of subItems) {
      if (bundle.subItemsCompleted[k]) out.add(k);
    }
    return out;
  }, [bundle, subItems]);

  const allChecked = subItems.length > 0 && checkedKeys.size === subItems.length;
  const awarded = bundle?.awarded ?? false;

  // Toggle a subitem. Creates the bundle on first interaction.
  const toggle = useCallback(
    (key: string, nextChecked: boolean) => {
      const store = getAppStore();
      const { actions } = store.getState();
      const current = store.getState().pendingHygieneBundle[jarId];
      // If bundle is awarded, do nothing — it resets via retroactive check on
      // next local-day rollover or via HygieneBundle new-day handling.
      if (current?.awarded) return;

      // Ensure a bundle exists for today before toggling.
      const hygieneDay = hygieneDayOf(new Date(), cutoffLocal);
      if (!current || current.date !== hygieneDay) {
        actions.resetHygieneBundle(jarId, hygieneDay);
        // Overwrite cutoff / subItems if they changed vs. the reset baseline.
        // (resetHygieneBundle reads the habit definition, so already fresh.)
      }

      // Write the toggle via the action (emits hygiene_subitem_checked when
      // checking; plain commit when unchecking).
      if (nextChecked) {
        actions.checkHygieneSubItem(jarId, key, nowISO());
      } else {
        actions.uncheckHygieneSubItem(jarId, key);
      }

      // A5: immediate award if all subItems completed and all are before cutoff.
      const afterToggle = store.getState().pendingHygieneBundle[jarId];
      if (!afterToggle || afterToggle.awarded) return;
      const finished = subItems.every((k) => afterToggle.subItemsCompleted[k]);
      if (finished && allBeforeCutoff(afterToggle, subItems)) {
        actions.completeHabit(habit.id, 1);
        actions.tickHygieneStreak(jarId, hygieneDay);
        actions.markHygieneAwarded(jarId, nowISO());
      }
    },
    [jarId, subItems, cutoffLocal, habit.id],
  );

  if (habit.unit.kind !== 'bundle') return null;

  return (
    <section
      className="hygiene-bundle"
      aria-labelledby="hygiene-bundle-title"
    >
      <header className="hygiene-bundle__header">
        <h2 id="hygiene-bundle-title" className="hygiene-bundle__title">
          {habit.name}
        </h2>
        <p
          className="hygiene-bundle__cutoff"
          aria-live="polite"
        >
          {awarded ? (
            <>Done for today. Nice.</>
          ) : pastCutoff ? (
            <>Past cutoff ({cutoffLocal}). Try again tomorrow.</>
          ) : (
            <>
              Bed by {cutoffLocal} — {formatCountdown(Math.max(0, minsLeft))} left
            </>
          )}
        </p>
      </header>

      <ul className="hygiene-bundle__list" aria-label="Sub-items">
        {subItems.map((key) => {
          const isChecked = checkedKeys.has(key);
          return (
            <li key={key} className="hygiene-bundle__item">
              <label className="hygiene-bundle__row">
                <input
                  type="checkbox"
                  className="hygiene-bundle__checkbox"
                  checked={isChecked}
                  disabled={pastCutoff || awarded}
                  onChange={(e) => toggle(key, e.target.checked)}
                  aria-label={key}
                />
                <span className="hygiene-bundle__label">{key}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {allChecked && awarded ? (
        <p className="hygiene-bundle__awarded" role="status" aria-live="polite">
          Clip earned.
        </p>
      ) : null}
    </section>
  );
}
