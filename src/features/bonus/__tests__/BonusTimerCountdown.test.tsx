// BonusTimerCountdown tests (3H).
// R1: endTimestamp - Date.now() is the ONLY authority. Fake clock covers
// "close + advance + reopen" scenarios.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

import { BonusTimerCountdown } from '../BonusTimerCountdown.tsx';
import { formatRemaining } from '../BonusTimerCountdown.util.ts';
import { asISO } from '../../../types/ids.ts';

describe('formatRemaining', () => {
  it('renders 0:00 at exactly 0 ms', () => {
    expect(formatRemaining(0)).toBe('0:00');
  });
  it('rounds up seconds (ceil)', () => {
    expect(formatRemaining(1)).toBe('0:01');
    expect(formatRemaining(999)).toBe('0:01');
    expect(formatRemaining(1500)).toBe('0:02');
  });
  it('renders minutes + padded seconds', () => {
    expect(formatRemaining(9 * 60_000 + 5_000)).toBe('9:05');
    expect(formatRemaining(10 * 60_000)).toBe('10:00');
  });
});

describe('BonusTimerCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders remaining time = endTimestamp - Date.now()', () => {
    const end = new Date('2026-04-23T12:07:30Z').toISOString();
    render(<BonusTimerCountdown endTimestamp={asISO(end)} />);
    const timer = screen.getByRole('timer');
    // 7:30 remaining.
    expect(timer.textContent).toContain('7:30');
  });

  it('shows 0:00 when already past endTimestamp (stale on mount)', () => {
    const end = new Date('2026-04-23T11:55:00Z').toISOString();
    render(<BonusTimerCountdown endTimestamp={asISO(end)} />);
    const timer = screen.getByRole('timer');
    expect(timer.textContent).toContain('0:00');
  });

  it('calls onExpire exactly once when the deadline has already passed at mount', () => {
    const onExpire = vi.fn();
    const end = new Date('2026-04-23T11:55:00Z').toISOString();
    render(
      <BonusTimerCountdown endTimestamp={asISO(end)} onExpire={onExpire} />,
    );
    // Force a tick so the rAF/visibilitychange path has a chance to fire.
    vi.advanceTimersByTime(100);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('exposes an aria-label with minutes remaining for the banner', () => {
    const end = new Date('2026-04-23T12:06:30Z').toISOString();
    render(<BonusTimerCountdown endTimestamp={asISO(end)} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-label')).toMatch(/minutes left/i);
    expect(timer.getAttribute('aria-live')).toBe('off');
  });

  it('reflects advancing the system clock (simulates reopen after 5min)', () => {
    const end = new Date('2026-04-23T12:10:00Z').toISOString();
    render(<BonusTimerCountdown endTimestamp={asISO(end)} />);
    // Initial: 10 minutes remaining.
    expect(screen.getByRole('timer').textContent).toContain('10:00');

    // Jump the system clock forward 5 minutes.
    vi.setSystemTime(new Date('2026-04-23T12:05:00Z'));
    // Firing visibilitychange forces a re-sync against Date.now() — this is
    // the "iOS foregrounds after background" path per R1.
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(50);
    });

    const label = screen.getByRole('timer').textContent ?? '';
    // 4:59 or 5:00 depending on rounding; either is acceptable.
    expect(label).toMatch(/(4:59|5:00)/);
  });
});
