// Near-miss D3 logic + animation-keyframe test.
//
// D3 asserts: every losing spin drifts past a *locked* tier before settling on
// the resolved segment. Two layers of coverage here:
//   (A) pure unit tests for `chooseNearMissDrift` over the cash-in matrix.
//   (B) component test: render a losing spin (RNG'd T1 while user has
//       0-cash-in), capture the drift choice, assert it targets a locked tier.

import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import {
  chooseNearMissDrift,
  isLosingSpin,
  lockedTiers,
} from './near-miss.ts';
import { resolveMainSpin, mainSegmentIndex } from './wheel.engine.ts';
import { WheelCanvas } from './WheelCanvas.tsx';
import { defaultWheelConfig } from '../../data/defaults.ts';
import { seededRng } from '../../test/seeded-rng.ts';
import type { MainSpinResult, Tier } from '../../types/wheel.ts';

afterEach(() => cleanup());

// ---- A: pure logic ----

describe('near-miss: lockedTiers', () => {
  it('0-cash-in locks T2 + T3', () => {
    expect(lockedTiers(null)).toEqual(['T2', 'T3']);
  });
  it('2-match (T2 unlocked) locks only T3', () => {
    expect(lockedTiers('T2')).toEqual(['T3']);
  });
  it('3-match (T3 unlocked) locks nothing', () => {
    expect(lockedTiers('T3')).toEqual([]);
  });
});

describe('near-miss: isLosingSpin', () => {
  it.each<[MainSpinResult['tier'], Tier | null, boolean]>([
    ['T1', null, false], // clean T1 win at 0-cash-in
    ['T2', null, true], // blocked T2 near-miss
    ['T3', null, true], // blocked T3 near-miss
    ['T1', 'T2', true], // hit below unlocked — "losing relative to top"
    ['T2', 'T2', false], // hit exactly unlocked
    ['T3', 'T3', false], // top win
    ['BONUS', null, false], // BONUS auto-collects best tier — always a win
    ['JACKPOT', null, false], // JACKPOT always a win regardless
  ])('tier %s, unlocked %s → losing=%s', (tier, unlocked, expected) => {
    expect(isLosingSpin({ tier }, unlocked)).toBe(expected);
  });
});

describe('near-miss: chooseNearMissDrift', () => {
  it('D3 — T1 result with 0-cash-in drifts past a locked tier (T2 or T3)', () => {
    const drift = chooseNearMissDrift({
      resolved: { tier: 'T1' },
      highestUnlockedTier: null,
    });
    expect(drift).not.toBeNull();
    expect(drift!.driftedPast === 'T2' || drift!.driftedPast === 'T3').toBe(
      true,
    );
    // The drift index must differ from the resolved index.
    expect(drift!.driftIndex).not.toBe(mainSegmentIndex('T1'));
  });

  it('prefers the adjacent higher-reward locked tier (T2 adjacent to T1)', () => {
    const drift = chooseNearMissDrift({
      resolved: { tier: 'T1' },
      highestUnlockedTier: null,
    });
    // T2 is adjacent to T1 (indexes 0, 1). Heuristic picks adjacent-most-desirable.
    expect(drift!.driftedPast).toBe('T2');
  });

  it('T2 result with 2-match cash-in drifts past T3 (only locked tier)', () => {
    const drift = chooseNearMissDrift({
      resolved: { tier: 'T2' },
      highestUnlockedTier: 'T2',
    });
    expect(drift).not.toBeNull();
    expect(drift!.driftedPast).toBe('T3');
  });

  it('T3 result with 3-match (nothing locked) → no drift', () => {
    const drift = chooseNearMissDrift({
      resolved: { tier: 'T3' },
      highestUnlockedTier: 'T3',
    });
    expect(drift).toBeNull();
  });

  it('BONUS never drifts — celebration moment, no theater', () => {
    const drift = chooseNearMissDrift({
      resolved: { tier: 'BONUS' },
      highestUnlockedTier: null,
    });
    expect(drift).toBeNull();
  });

  it('JACKPOT never drifts', () => {
    const drift = chooseNearMissDrift({
      resolved: { tier: 'JACKPOT' },
      highestUnlockedTier: null,
    });
    expect(drift).toBeNull();
  });

  it('D3: never drifts past the same segment it resolves on', () => {
    // Covers all combinations — drift index must differ from resolved index.
    const cases: Array<[MainSpinResult['tier'], Tier | null]> = [
      ['T1', null],
      ['T2', null],
      ['T3', null],
      ['T1', 'T2'],
      ['T2', 'T2'],
      ['T1', 'T3'],
    ];
    for (const [tier, unlocked] of cases) {
      const drift = chooseNearMissDrift({
        resolved: { tier },
        highestUnlockedTier: unlocked,
      });
      if (drift === null) continue;
      expect(drift.driftIndex).not.toBe(mainSegmentIndex(tier));
    }
  });
});

// ---- B: component assertion (RTL) ----

describe('WheelCanvas renders locked-tier segment that theater will drift through', () => {
  it('losing spin (RNG T1, 0-cash-in) → canvas receives a driftIndex pointing at a locked tier', () => {
    // Find a seed that RNGs T1 with default config + null cash-in → losing spin.
    const cfg = defaultWheelConfig();
    let chosenSeed = -1;
    let result: MainSpinResult | null = null;
    for (let seed = 1; seed < 100 && result === null; seed++) {
      const r = resolveMainSpin(cfg, seededRng(seed));
      if (r.tier === 'T1') {
        chosenSeed = seed;
        result = r;
      }
    }
    expect(result?.tier).toBe('T1');
    expect(chosenSeed).toBeGreaterThan(0);

    const drift = chooseNearMissDrift({
      resolved: result!,
      highestUnlockedTier: null, // 0-cash-in: T2 + T3 are locked
    });
    expect(drift).not.toBeNull();
    expect(drift!.driftedPast === 'T2' || drift!.driftedPast === 'T3').toBe(
      true,
    );

    // Render the canvas — the drift segment must be in the DOM, distinct from
    // the resolved segment, so the animation has a segment to pass through.
    const { container } = render(
      <WheelCanvas
        targetSegmentIndex={mainSegmentIndex(result!.tier)}
        nearMissDriftIndex={drift!.driftIndex}
        idle={true /* suppress animation start; we just assert DOM */}
      />,
    );

    const driftNode = container.querySelector(
      `[data-segment-index="${drift!.driftIndex}"]`,
    );
    const targetNode = container.querySelector(
      `[data-segment-index="${mainSegmentIndex(result!.tier)}"]`,
    );
    expect(driftNode).not.toBeNull();
    expect(targetNode).not.toBeNull();
    expect(driftNode).not.toBe(targetNode);

    // Drift node must be tagged with a locked tier (T2 or T3 in 0-cash-in).
    const driftTier = driftNode!.getAttribute('data-tier');
    expect(driftTier === 'T2' || driftTier === 'T3').toBe(true);
  });
});
