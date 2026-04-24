/**
 * haptics.ts — `navigator.vibrate` wrapper (3J).
 *
 * Per SPEC §7.1 / §11 / §12 we want subtle haptic feedback for wins and near
 * misses. Wrapped here so callers never have to feature-detect:
 * - iOS Safari: `navigator.vibrate` is absent → no-op.
 * - Android Chrome / desktop Chrome: honors pattern.
 * - User setting to disable will be layered on top by 3I (settings slice);
 *   for now we read an optional globally-set mute flag via
 *   `setHapticsEnabled(false)` so the shell can be quiet without settings.
 */

let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function hapticsEnabled(): boolean {
  return enabled;
}

/**
 * Fire a vibration pattern. Silently no-ops when:
 * - user has disabled haptics
 * - the platform lacks `navigator.vibrate`
 * - pattern is empty or the call throws (some UAs throw outside a user gesture)
 */
export function vibrate(pattern: number | number[]): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined') return;
  const vib = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  if (typeof vib !== 'function') return;
  try {
    vib.call(navigator, Array.isArray(pattern) ? pattern : [pattern]);
  } catch {
    // swallow — haptics is inessential per SPEC §7.1 ("optional")
  }
}

/** Semantic presets so feature agents don't have to reinvent patterns. */
export const haptics = {
  /** Light tap — tap feedback on primary buttons. */
  tap: (): void => vibrate(10),
  /** Clip earned. */
  clipEarn: (): void => vibrate([15, 25, 15]),
  /** Wheel tick during spin decel. Call per tick. */
  spinTick: (): void => vibrate(5),
  /** Small win (T1). */
  winSmall: (): void => vibrate([25, 40, 25]),
  /** Medium win (T2). */
  winMid: (): void => vibrate([40, 60, 40, 60, 40]),
  /** Big win (T3 / jackpot). */
  winBig: (): void => vibrate([60, 80, 60, 80, 120]),
  /** Gold clip draw — distinct long shimmer (SPEC §11 "make gold feel special"). */
  gold: (): void => vibrate([30, 40, 30, 40, 30, 40, 120]),
  /** Near-miss — one soft, deflating buzz. */
  nearMiss: (): void => vibrate(80),
} as const;
