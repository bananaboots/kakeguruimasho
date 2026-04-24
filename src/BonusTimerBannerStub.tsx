/**
 * BonusTimerBannerStub — placeholder for 3H's persistent banner (3J).
 *
 * Intentionally renders nothing. When 3H lands, it will replace this import
 * with the real <BonusTimerBanner /> that subscribes to bonusSlice and shows
 * a sticky header when `bonusTimerState.timers` has ≥ 1 active entry.
 *
 * Wave 2+ note: banner should be position: sticky; top: 0 so it floats above
 * route content but below any modal overlay. Use `.toast__viewport` z-index
 * (1100) as your ceiling.
 */

export function BonusTimerBannerStub() {
  return null;
}
