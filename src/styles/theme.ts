/**
 * theme.ts — Design tokens mirrored as TS constants.
 * Keep in sync with `src/styles/tokens.css`.
 *
 * Use for inline styles (e.g. Framer Motion animate props in Wave 2+) where
 * CSS variables would require extra round-trips. Prefer the CSS tokens where
 * possible so runtime theme switching (future) stays feasible.
 */

export const theme = {
  color: {
    bg: '#0a0a0b',
    surface: '#141417',
    surface2: '#1d1d22',
    surface3: '#26262c',
    border: '#2a2a2f',
    borderStrong: '#3a3a42',
    text: '#f5f5f7',
    textMuted: '#a1a1aa',
    textFaint: '#6b6b73',
    accent: '#e53935',
    accentHover: '#f04a46',
    accentPressed: '#c5302c',
    accentContrast: '#ffffff',
    gold: '#ffd700',
    goldGlow: 'rgba(255, 215, 0, 0.35)',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#fbbf24',
    nearMiss: '#fbbf24',
    clip: {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      yellow: '#eab308',
      purple: '#a855f7',
      pink: '#ec4899',
    },
  },
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
