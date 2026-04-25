/**
 * theme-provider.tsx — Active-theme provider component.
 *
 * Holds the current `ThemeKey`, persists it in localStorage, and writes
 * `data-theme` on `<html>` so CSS variables in `themes.css` cascade to
 * every surface.
 *
 * For consumer access, import `useTheme` from `./theme-context.ts` —
 * keeping the hook in a separate module lets Vite fast-refresh handle
 * this provider correctly (components-only file rule).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ThemeContext, type ThemeContextValue } from './theme-context.ts';
import { DEFAULT_THEME, THEMES, type ThemeKey, isThemeKey } from './themes.ts';

const STORAGE_KEY = 'kakegurui:theme';

function readStoredTheme(): ThemeKey {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isThemeKey(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => readStoredTheme());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeState(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // localStorage may be unavailable (private mode); the in-memory state still wins.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeMeta: THEMES[theme], setTheme }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
