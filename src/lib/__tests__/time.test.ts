import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDaysLocal,
  dayDelta,
  isPastCutoff,
  localDateOf,
  nowISO,
  parseLocalTime,
  todayLocal,
} from '../time.ts';
import type { ISOTimestamp, LocalDate } from '../../types/ids.ts';

describe('time helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('nowISO / todayLocal', () => {
    it('nowISO returns a parseable ISO string', () => {
      vi.setSystemTime(new Date('2026-04-23T15:00:00.000Z'));
      const ts = nowISO();
      expect(typeof ts).toBe('string');
      expect(Number.isNaN(Date.parse(ts))).toBe(false);
    });

    it('todayLocal uses device-local day', () => {
      vi.setSystemTime(new Date(2026, 3, 23, 12, 0, 0)); // Apr 23 local, noon
      expect(todayLocal()).toBe('2026-04-23');
    });
  });

  describe('localDateOf', () => {
    it('returns YYYY-MM-DD local', () => {
      vi.setSystemTime(new Date(2026, 3, 23, 14, 0, 0));
      const ts = nowISO();
      expect(localDateOf(ts)).toBe('2026-04-23');
    });

    it('late-night timestamps still belong to their local calendar day', () => {
      const ts = new Date(2026, 3, 23, 23, 59, 59).toISOString() as ISOTimestamp;
      expect(localDateOf(ts)).toBe('2026-04-23');
    });
  });

  describe('isPastCutoff', () => {
    it('returns true at or after cutoff', () => {
      const ts = new Date(2026, 3, 23, 1, 0, 0).toISOString() as ISOTimestamp;
      expect(isPastCutoff(ts, '01:00')).toBe(true);
    });
    it('returns false before cutoff', () => {
      const ts = new Date(2026, 3, 23, 0, 59, 0).toISOString() as ISOTimestamp;
      expect(isPastCutoff(ts, '01:00')).toBe(false);
    });
    it('handles default "01:00" hygiene cutoff across edge minutes', () => {
      const cases: Array<[number, number, boolean]> = [
        [0, 59, false],
        [1, 0, true],
        [1, 1, true],
      ];
      for (const [h, m, expected] of cases) {
        const ts = new Date(2026, 3, 23, h, m, 0).toISOString() as ISOTimestamp;
        expect(isPastCutoff(ts, '01:00')).toBe(expected);
      }
    });
  });

  describe('parseLocalTime', () => {
    it('accepts HH:MM', () => {
      expect(parseLocalTime('00:00')).toBe(0);
      expect(parseLocalTime('01:00')).toBe(60);
      expect(parseLocalTime('23:59')).toBe(23 * 60 + 59);
    });
    it('rejects garbage', () => {
      expect(() => parseLocalTime('abc')).toThrow();
      expect(() => parseLocalTime('25:00')).toThrow();
      expect(() => parseLocalTime('12:60')).toThrow();
    });
  });

  describe('dayDelta', () => {
    const d = (raw: string): LocalDate => raw as LocalDate;
    it('same', () => {
      expect(dayDelta(d('2026-04-23'), d('2026-04-23'))).toBe('same');
    });
    it('next', () => {
      expect(dayDelta(d('2026-04-23'), d('2026-04-24'))).toBe('next');
    });
    it('skip', () => {
      expect(dayDelta(d('2026-04-23'), d('2026-04-25'))).toBe('skip');
    });
    it('back', () => {
      expect(dayDelta(d('2026-04-23'), d('2026-04-22'))).toBe('back');
    });
    it('handles DST spring-forward (March 2nd Sunday)', () => {
      // San Diego spring forward: 2026-03-08 (if DST). Even so, the dayDelta
      // anchors at noon so wall-clock jumps are absorbed.
      expect(dayDelta(d('2026-03-07'), d('2026-03-08'))).toBe('next');
      expect(dayDelta(d('2026-03-08'), d('2026-03-09'))).toBe('next');
    });
    it('handles DST fall-back (Nov 1st Sunday)', () => {
      expect(dayDelta(d('2026-10-31'), d('2026-11-01'))).toBe('next');
      expect(dayDelta(d('2026-11-01'), d('2026-11-02'))).toBe('next');
    });
  });

  describe('addDaysLocal', () => {
    it('forward', () => {
      expect(addDaysLocal('2026-04-23' as LocalDate, 1)).toBe('2026-04-24');
    });
    it('backward', () => {
      expect(addDaysLocal('2026-04-23' as LocalDate, -1)).toBe('2026-04-22');
    });
    it('month rollover', () => {
      expect(addDaysLocal('2026-04-30' as LocalDate, 1)).toBe('2026-05-01');
    });
    it('year rollover', () => {
      expect(addDaysLocal('2026-12-31' as LocalDate, 1)).toBe('2027-01-01');
    });
    it('crosses DST spring forward cleanly', () => {
      // 30-day bucket spanning DST transition.
      expect(addDaysLocal('2026-03-01' as LocalDate, 30)).toBe('2026-03-31');
    });
  });
});
