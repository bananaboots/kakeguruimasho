/**
 * Non-component helpers for BonusTimerCountdown.
 *
 * Extracted to a sibling module so the `.tsx` file exports only components
 * (satisfies react-refresh/only-export-components).
 */

export function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
