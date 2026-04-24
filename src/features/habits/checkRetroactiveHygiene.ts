/**
 * checkRetroactiveHygiene — on-boot hygiene reconciliation (3D).
 *
 * SPEC §5.8 + A5 (DECISIONS): "Clip awarded retroactively on next app open
 * after midnight" — plus A5 refinement: the award depends on whether all 4
 * subItems were completed BEFORE the configured cutoff.
 *
 * On app open:
 *   - If `pendingHygieneBundle[jarId]` is null or today's date:
 *       nothing to reconcile; leave as-is.
 *   - If bundle.date < today AND awarded === false:
 *       - If all subItems have timestamps AND each is before cutoff:
 *           → call completeHabit(hygieneId, 1), tick hygiene streak,
 *             mark awarded=true on the captured bundle (for audit), then
 *             RESET pendingHygieneBundle to null so a fresh today-bundle
 *             starts clean.
 *       - Else: incomplete → reset to null (today's bundle starts fresh).
 *
 * Call site: `src/main.tsx` (or `App.tsx` useEffect) runs this once on mount
 * after the store hydrates.
 */

import { getAppStore } from '../../state/store.ts';
import {
  addDaysLocal,
  nowISO,
  parseLocalTime,
  todayLocal,
} from '../../lib/time.ts';
import type { HygieneBundleState } from '../../types/habit.ts';
import type { ISOTimestamp, JarId, LocalDate } from '../../types/ids.ts';
import { DEFAULT_HABIT_IDS } from '../../data/defaults.ts';

/**
 * The wall-clock *deadline* for a bundle tracking `bundle.date` with cutoff
 * `cutoffLocal` is: 01:00 on (bundle.date + 1). I.e., the start of the day
 * following the hygiene-day, at the cutoff time.
 *
 * A subitem completion `ts` is "before cutoff" iff `ts < deadline`.
 */
function deadlineFor(bundleDate: LocalDate, cutoffLocal: string): Date {
  const next = addDaysLocal(bundleDate, 1);
  const [y, m, d] = next.split('-').map(Number);
  const cutoffMinutes = parseLocalTime(cutoffLocal);
  const h = Math.floor(cutoffMinutes / 60);
  const mm = cutoffMinutes % 60;
  return new Date(y!, m! - 1, d!, h, mm, 0, 0);
}

function isBeforeDeadline(ts: ISOTimestamp, deadline: Date): boolean {
  return new Date(ts).getTime() < deadline.getTime();
}

export interface RetroactiveResult {
  /** true if a clip was awarded retroactively. */
  awarded: boolean;
  /** jar touched; null if nothing was eligible. */
  jarId: JarId | null;
}

function allSubItemsBeforeCutoff(
  bundle: HygieneBundleState,
  subItems: string[],
): boolean {
  const deadline = deadlineFor(bundle.date, bundle.cutoffLocal);
  for (const key of subItems) {
    const ts = bundle.subItemsCompleted[key];
    if (!ts) return false;
    if (!isBeforeDeadline(ts, deadline)) return false;
  }
  return true;
}

export function checkRetroactiveHygiene(): RetroactiveResult {
  const store = getAppStore();
  const state = store.getState();
  const jarId = state.activeJarId;
  const bundle = state.pendingHygieneBundle[jarId] ?? null;

  if (!bundle) return { awarded: false, jarId: null };

  const today = todayLocal();
  if (bundle.date >= today) {
    // Today's bundle is still in progress — nothing retroactive to do.
    return { awarded: false, jarId: null };
  }

  // Past-day bundle. Decide award vs. reset.
  const hygiene = state.habits.find((h) => h.id === DEFAULT_HABIT_IDS.hygiene);
  const subItems =
    hygiene && hygiene.unit.kind === 'bundle' ? hygiene.unit.subItems : [];

  let didAward = false;
  if (!bundle.awarded && subItems.length > 0) {
    const eligible = allSubItemsBeforeCutoff(bundle, subItems);
    if (eligible) {
      const { actions } = state;
      actions.completeHabit(DEFAULT_HABIT_IDS.hygiene, 1);
      actions.tickHygieneStreak(jarId, bundle.date);
      actions.markHygieneAwarded(jarId, nowISO());
      didAward = true;
    }
  }

  // Reset pendingHygieneBundle for today so the UI starts clean.
  // (resetHygieneBundle emits a settings_changed history event, which also
  // flushes to IDB — same persistence guarantee as the previous path.)
  getAppStore().getState().actions.resetHygieneBundle(jarId, today);

  return { awarded: didAward, jarId };
}
