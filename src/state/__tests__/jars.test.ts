import { describe, expect, it } from 'vitest';

import { seedInitialAppState } from '../../data/defaults.ts';
import {
  cashInClips,
  claimMilestone,
  earnClipToHand,
  returnClipsToBag,
  resetJar,
  classifyCashIn,
} from '../slices/jars.ts';
import type { AppState } from '../../types/app-state.ts';
import type { Clip } from '../../types/clip.ts';
import {
  DEFAULT_JAR_ID,
  asClipId,
  asISO,
} from '../../types/ids.ts';

function fresh(): AppState {
  return seedInitialAppState();
}

describe('jars slice', () => {
  describe('classifyCashIn', () => {
    const base = (id: string, color: 'red' | 'blue'): Clip => ({
      id: asClipId(id),
      jarId: DEFAULT_JAR_ID,
      kind: 'regular',
      color,
    });

    it('empty → none', () => {
      expect(classifyCashIn([])).toBe('none');
    });
    it('1 regular → none', () => {
      expect(classifyCashIn([base('c1', 'red')])).toBe('none');
    });
    it('2 same color → two-match', () => {
      expect(classifyCashIn([base('c1', 'red'), base('c2', 'red')])).toBe('two-match');
    });
    it('3 same color → three-match', () => {
      expect(
        classifyCashIn([base('c1', 'red'), base('c2', 'red'), base('c3', 'red')]),
      ).toBe('three-match');
    });
    it('2 different colors → none', () => {
      expect(classifyCashIn([base('c1', 'red'), base('c2', 'blue')])).toBe('none');
    });
    it('1 gold → gold-instant-T3', () => {
      const gold: Clip = { id: asClipId('g'), jarId: DEFAULT_JAR_ID, kind: 'gold' };
      expect(classifyCashIn([gold])).toBe('gold-instant-T3');
    });
    it('gold + regular is invalid → none', () => {
      const gold: Clip = { id: asClipId('g'), jarId: DEFAULT_JAR_ID, kind: 'gold' };
      expect(classifyCashIn([gold, base('c1', 'red')])).toBe('none');
    });
  });

  describe('earnClipToHand', () => {
    it('pushes to hand and increments jar total', () => {
      const s = fresh();
      const clip: Clip = {
        id: asClipId('test1'),
        jarId: DEFAULT_JAR_ID,
        kind: 'regular',
        color: 'red',
      };
      const next = earnClipToHand(s, DEFAULT_JAR_ID, clip);
      expect(next.hands[DEFAULT_JAR_ID]).toHaveLength(1);
      expect(next.jars[DEFAULT_JAR_ID]!.total).toBe(1);
    });
  });

  describe('returnClipsToBag', () => {
    it('moves the clip from hand to bag', () => {
      let s = fresh();
      const clip: Clip = {
        id: asClipId('test1'),
        jarId: DEFAULT_JAR_ID,
        kind: 'regular',
        color: 'red',
      };
      s = earnClipToHand(s, DEFAULT_JAR_ID, clip);
      const bagBefore = s.bags[DEFAULT_JAR_ID]!.length;
      const next = returnClipsToBag(s, DEFAULT_JAR_ID, [clip.id]);
      expect(next.hands[DEFAULT_JAR_ID]).toHaveLength(0);
      expect(next.bags[DEFAULT_JAR_ID]!.length).toBe(bagBefore + 1);
    });
  });

  describe('cashInClips', () => {
    it('classifies + returns clips to bag', () => {
      let s = fresh();
      const a: Clip = { id: asClipId('a'), jarId: DEFAULT_JAR_ID, kind: 'regular', color: 'red' };
      const b: Clip = { id: asClipId('b'), jarId: DEFAULT_JAR_ID, kind: 'regular', color: 'red' };
      s = earnClipToHand(s, DEFAULT_JAR_ID, a);
      s = earnClipToHand(s, DEFAULT_JAR_ID, b);
      const { state, result } = cashInClips(s, DEFAULT_JAR_ID, [a.id, b.id]);
      expect(result.matchKind).toBe('two-match');
      expect(result.unlockedTier).toBe('T2');
      expect(state.hands[DEFAULT_JAR_ID]).toHaveLength(0);
      // Jar total is untouched (§5.5 — cash-in doesn't affect $ tally).
      expect(state.jars[DEFAULT_JAR_ID]!.total).toBe(s.jars[DEFAULT_JAR_ID]!.total);
    });

    it('gold → instant T3', () => {
      let s = fresh();
      const gold: Clip = { id: asClipId('g'), jarId: DEFAULT_JAR_ID, kind: 'gold' };
      s = earnClipToHand(s, DEFAULT_JAR_ID, gold);
      const { result } = cashInClips(s, DEFAULT_JAR_ID, [gold.id]);
      expect(result.matchKind).toBe('gold-instant-T3');
      expect(result.unlockedTier).toBe('T3');
      expect(result.instantT3).toBe(true);
    });
  });

  describe('D1: milestone claim semantics', () => {
    it('mini claim does NOT reset jar total', () => {
      const s = fresh();
      // Force total past the target via earnClipToHand simulation.
      const simulated: AppState = {
        ...s,
        jars: {
          ...s.jars,
          [DEFAULT_JAR_ID]: {
            ...s.jars[DEFAULT_JAR_ID]!,
            total: 25,
            milestones: {
              mini: { id: 'mini', label: 'mini', target: 20 },
              mid: { id: 'mid', label: 'mid', target: 50 },
              moonshot: { id: 'moonshot', label: 'moon', target: 100 },
            },
          },
        },
      };
      const next = claimMilestone(simulated, DEFAULT_JAR_ID, 'mini', asISO('2026-04-23T12:00:00.000Z'));
      expect(next.jars[DEFAULT_JAR_ID]!.claimed.mini).not.toBeNull();
      expect(next.jars[DEFAULT_JAR_ID]!.total).toBe(25); // unchanged per D1
    });

    it('mid claim does NOT reset jar total', () => {
      const s = fresh();
      const simulated: AppState = {
        ...s,
        jars: {
          ...s.jars,
          [DEFAULT_JAR_ID]: {
            ...s.jars[DEFAULT_JAR_ID]!,
            total: 55,
          },
        },
      };
      const next = claimMilestone(simulated, DEFAULT_JAR_ID, 'mid', asISO('2026-04-23T12:00:00.000Z'));
      expect(next.jars[DEFAULT_JAR_ID]!.claimed.mid).not.toBeNull();
      expect(next.jars[DEFAULT_JAR_ID]!.total).toBe(55);
    });

    it('moonshot claim still does NOT reset total on its own; resetJar is a separate action', () => {
      const s = fresh();
      const simulated: AppState = {
        ...s,
        jars: {
          ...s.jars,
          [DEFAULT_JAR_ID]: {
            ...s.jars[DEFAULT_JAR_ID]!,
            total: 200,
          },
        },
      };
      const afterClaim = claimMilestone(
        simulated,
        DEFAULT_JAR_ID,
        'moonshot',
        asISO('2026-04-23T12:00:00.000Z'),
      );
      expect(afterClaim.jars[DEFAULT_JAR_ID]!.claimed.moonshot).not.toBeNull();
      expect(afterClaim.jars[DEFAULT_JAR_ID]!.total).toBe(200);

      // resetJar (moonshot-triggered): zero total AND clear claims.
      const afterReset = resetJar(afterClaim, DEFAULT_JAR_ID);
      expect(afterReset.jars[DEFAULT_JAR_ID]!.total).toBe(0);
      expect(afterReset.jars[DEFAULT_JAR_ID]!.claimed.mini).toBeNull();
      expect(afterReset.jars[DEFAULT_JAR_ID]!.claimed.mid).toBeNull();
      expect(afterReset.jars[DEFAULT_JAR_ID]!.claimed.moonshot).toBeNull();
    });
  });
});
