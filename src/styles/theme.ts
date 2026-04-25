/**
 * theme.ts — Structural tokens mirrored as TS constants.
 *
 * Color/font tokens are now theme-driven (see `themes.css` + `themes.ts`).
 * This mirror only carries the values that don't change per theme — spacing,
 * radii, motion, layout — for inline-style consumers (Framer Motion durations,
 * computed widths, etc.) that can't reach into CSS variables conveniently.
 *
 * For colors at runtime, read CSS variables via
 * `getComputedStyle(document.documentElement).getPropertyValue('--color-gold')`
 * or use the `useTheme()` hook for theme metadata + copy strings.
 */

export const theme = {
  radius: {
    xs: 4,
    sm: 8,
    card: 12,
    lg: 16,
    pill: 9999,
  },
  space: {
    s1: 4,
    s2: 8,
    s3: 12,
    s4: 16,
    s5: 20,
    s6: 24,
    s8: 32,
  },
  tapTargetMin: 44,
  bottomNavHeight: 64,
  motion: {
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    durationFast: 120,
    durationBase: 220,
    durationSlow: 420,
  },
} as const;

export type Theme = typeof theme;
