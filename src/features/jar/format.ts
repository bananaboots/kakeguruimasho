/**
 * Shared formatting helpers for the Jar feature.
 * Uses the built-in Intl.NumberFormat — no added dependency.
 */

let cached: Intl.NumberFormat | null = null;
function fmt(): Intl.NumberFormat {
  if (!cached) {
    cached = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      maximumFractionDigits: 0,
    });
  }
  return cached;
}

export function formatDollars(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return `$${fmt().format(Math.max(0, Math.floor(safe)))}`;
}
