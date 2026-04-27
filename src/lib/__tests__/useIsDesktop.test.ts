import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsDesktop } from '../useIsDesktop.ts';

function setMatchMedia(matches: boolean): { dispatchChange: (next: boolean) => void } {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches,
    media: '(min-width: 1024px)',
    addEventListener: (_t: 'change', cb: (e: MediaQueryListEvent) => void) =>
      listeners.add(cb),
    removeEventListener: (_t: 'change', cb: (e: MediaQueryListEvent) => void) =>
      listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockReturnValue(mql);
  return {
    dispatchChange: (next: boolean) => {
      (mql as unknown as { matches: boolean }).matches = next;
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe('useIsDesktop', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns false at narrow viewports', () => {
    setMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it('returns true at ≥1024px', () => {
    setMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('updates when the viewport crosses the breakpoint', () => {
    const { dispatchChange } = setMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
    act(() => dispatchChange(true));
    expect(result.current).toBe(true);
  });
});
