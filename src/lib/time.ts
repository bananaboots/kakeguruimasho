// Time helpers (A5, A8, R8). Single place for day-boundary logic.

import type { ISOTimestamp, LocalDate } from '../types/ids.ts';

/** Current wall-clock time as an ISO-8601 string with `Z` suffix. */
export function nowISO(): ISOTimestamp {
  return new Date().toISOString() as ISOTimestamp;
}

/** ISO from a `Date`; useful in tests where we inject a `Date`. */
export function isoOf(d: Date): ISOTimestamp {
  return d.toISOString() as ISOTimestamp;
}

/**
 * Device-local YYYY-MM-DD for the given timestamp. Uses the runtime's local
 * TZ — tests pin this via `vi.setSystemTime`.
 */
export function localDateOf(ts: ISOTimestamp): LocalDate {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as LocalDate;
}

/** `localDateOf(nowISO())`, convenience. */
export function todayLocal(): LocalDate {
  return localDateOf(nowISO());
}

/**
 * Parse "HH:MM" → minutes since midnight. Throws on invalid input.
 */
export function parseLocalTime(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) throw new Error(`Invalid local time: ${hhmm}`);
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Invalid local time: ${hhmm}`);
  }
  return h * 60 + m;
}

/**
 * Is the given timestamp at or past the cutoff wall-clock time of its own
 * local day? e.g. `isPastCutoff(ts, "01:00")` is true if the device-local
 * time-of-day portion of `ts` is >= 01:00.
 *
 * Specifically: used by hygiene bundle (A5) to check whether all subitems
 * were done BEFORE the cutoff. The semantics the caller wants is "completed
 * by cutoff", which is `!isPastCutoff(subItemCompletedTs, cutoff)`.
 */
export function isPastCutoff(ts: ISOTimestamp, cutoffHHMM: string): boolean {
  const d = new Date(ts);
  const cutoffMinutes = parseLocalTime(cutoffHHMM);
  const tsMinutes = d.getHours() * 60 + d.getMinutes();
  return tsMinutes >= cutoffMinutes;
}

/**
 * Has the LocalDate advanced relative to `prev`? Returns:
 *  - "same"   — same calendar day
 *  - "next"   — prev + 1 day (strict rollover)
 *  - "skip"   — more than one day elapsed (daily streak should break)
 *  - "back"   — prev is in the future (clock-skew protection; treat as same)
 */
export function dayDelta(prev: LocalDate, curr: LocalDate): 'same' | 'next' | 'skip' | 'back' {
  if (prev === curr) return 'same';
  // Construct noon-anchored Dates so DST never shifts the comparison.
  const [py, pm, pd] = prev.split('-').map(Number);
  const [cy, cm, cd] = curr.split('-').map(Number);
  if (py === undefined || pm === undefined || pd === undefined) return 'same';
  if (cy === undefined || cm === undefined || cd === undefined) return 'same';
  const pDate = new Date(py, pm - 1, pd, 12);
  const cDate = new Date(cy, cm - 1, cd, 12);
  const ms = cDate.getTime() - pDate.getTime();
  const days = Math.round(ms / 86_400_000);
  if (days === 0) return 'same';
  if (days === 1) return 'next';
  if (days > 1) return 'skip';
  return 'back';
}

/**
 * Add (possibly negative) days to a LocalDate, returning a new LocalDate.
 * Uses noon-anchored Date construction to avoid DST boundary issues.
 */
export function addDaysLocal(date: LocalDate, delta: number): LocalDate {
  const [y, m, d] = date.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Invalid LocalDate: ${date}`);
  }
  const anchor = new Date(y, m - 1, d + delta, 12);
  const year = anchor.getFullYear();
  const month = String(anchor.getMonth() + 1).padStart(2, '0');
  const day = String(anchor.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` as LocalDate;
}
