/**
 * theme-context.ts — Context object + `useTheme` hook.
 *
 * Split out of `theme-provider.tsx` so the provider file can stay a
 * components-only module (Vite fast-refresh requirement).
 */

import { createContext, useContext } from 'react';
import { DEFAULT_THEME, THEMES, type ThemeKey, type ThemeMeta } from './themes.ts';

export interface ThemeContextValue {
  theme: ThemeKey;
  themeMeta: ThemeMeta;
  setTheme: (key: ThemeKey) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Falls back to the default theme + a no-op setter when called outside the
 * provider, so unit tests can render any consumer without wrapping.
 */
const FALLBACK_VALUE: ThemeContextValue = {
  theme: DEFAULT_THEME,
  themeMeta: THEMES[DEFAULT_THEME],
  setTheme: () => {
    /* no-op outside provider */
  },
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? FALLBACK_VALUE;
}
