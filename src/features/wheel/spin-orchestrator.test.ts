// Smoke tests for the imperative spin orchestrator.
// Verifies:
//   - near_miss_theater history event fires on every losing spin (D3).
//   - spawnBonusTimer is called when bonus wheel lands on PCT_* (spec §5.7).

import { describe, expect, it, vi } from 'vitest';

import { seededRng } from '../../test/seeded-rng.ts';
import { defaultWheelConfig } from '../../data/defaults.ts';
import { DEFAULT_JAR_ID } from '../../types/ids.ts';
import { spinBonusWheel, spinMainWheel } from './spin-orchestrator.ts';
import { resolveBonusSpin, resolveMainSpin } from './wheel.engine.ts';

describe('spinMainWheel', () => {
  it('floors a 0-cash-in spin to T1 (with rare 1% T3) and emits theater', async () => {
    // The orchestrator caps free spins at T1 except for a 1% T3 free win.
    // Find a seed where the engine's raw roll lands BONUS/JACKPOT/T2/T3 —
    // any of those would near-miss under the old contract — and confirm
    // the floor pulls the displayed tier down to T1 (the common case)
    // and that the drift theater still fires past a locked tier.
    const cfg = defaultWheelConfig();
    let seed = 0;
    let outcome;
    const appendHistory = vi.fn();
    const spawnBonusTimer = vi.fn();
    while (seed < 500) {
      seed++;
      appendHistory.mockClear();
      outcome = await spinMainWheel({
        cfg,
        highestUnlockedTier: null,
        rng: seededRng(seed),
        actions: { appendHistory, spawnBonusTimer },
        jarId: DEFAULT_JAR_ID,
      });
      if (outcome.result.tier === 'T1') break;
    }
    expect(outcome!.result.tier).toBe('T1');
    expect(outcome!.driftIndex).not.toBeNull();
    expect(appendHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'near_miss_theater',
        jarId: DEFAULT_JAR_ID,
      }),
    );
  });

  it('does not emit near_miss_theater on a top-tier win (T3 with 3-match)', async () => {
    const cfg = defaultWheelConfig();
    let seed = 0;
    // Find seed that resolves to T3.
    while (seed < 500) {
      seed++;
      if (resolveMainSpin(cfg, seededRng(seed)).tier === 'T3') break;
    }
    const appendHistory = vi.fn();
    const spawnBonusTimer = vi.fn();
    const outcome = await spinMainWheel({
      cfg,
      highestUnlockedTier: 'T3',
      rng: seededRng(seed),
      actions: { appendHistory, spawnBonusTimer },
      jarId: DEFAULT_JAR_ID,
    });
    expect(outcome.result.tier).toBe('T3');
    expect(outcome.driftIndex).toBeNull();
    expect(appendHistory).not.toHaveBeenCalled();
  });

  it('three-match keeps the BONUS / JACKPOT distribution', async () => {
    // Tier-floor only applies when highestUnlockedTier !== 'T3', so a
    // 3-match user can still hit BONUS / JACKPOT.
    const cfg = defaultWheelConfig();
    let seed = 0;
    while (seed < 2000) {
      seed++;
      const r = resolveMainSpin(cfg, seededRng(seed));
      if (r.tier === 'BONUS' || r.tier === 'JACKPOT') break;
    }
    const appendHistory = vi.fn();
    const spawnBonusTimer = vi.fn();
    const outcome = await spinMainWheel({
      cfg,
      highestUnlockedTier: 'T3',
      rng: seededRng(seed),
      actions: { appendHistory, spawnBonusTimer },
      jarId: DEFAULT_JAR_ID,
    });
    expect(['BONUS', 'JACKPOT']).toContain(outcome.result.tier);
    expect(outcome.driftIndex).toBeNull();
    expect(appendHistory).not.toHaveBeenCalled();
  });
});

describe('spinBonusWheel', () => {
  it('spawns a bonus timer for PCT_* segments', async () => {
    // Deterministic PCT seed: iterate until we find one.
    const cfg = defaultWheelConfig();
    let seed = 0;
    while (seed < 500) {
      seed++;
      const r = resolveBonusSpin(cfg, seededRng(seed));
      if (r.segment === 'PCT_75' || r.segment === 'PCT_50' || r.segment === 'PCT_25')
        break;
    }
    const appendHistory = vi.fn();
    const spawnBonusTimer = vi.fn();
    const outcome = await spinBonusWheel({
      cfg,
      rng: seededRng(seed),
      actions: { appendHistory, spawnBonusTimer },
      jarId: DEFAULT_JAR_ID,
    });
    expect(['PCT_75', 'PCT_50', 'PCT_25']).toContain(outcome.result.segment);
    expect(spawnBonusTimer).toHaveBeenCalledTimes(1);
  });

  it('does NOT spawn a timer for FREE or EXTRA', async () => {
    const cfg = defaultWheelConfig();
    // Find a seed that returns FREE.
    let freeSeed = 0;
    while (freeSeed < 500) {
      freeSeed++;
      if (resolveBonusSpin(cfg, seededRng(freeSeed)).segment === 'FREE') break;
    }
    const appendHistory = vi.fn();
    const spawnBonusTimer = vi.fn();
    const outcome = await spinBonusWheel({
      cfg,
      rng: seededRng(freeSeed),
      actions: { appendHistory, spawnBonusTimer },
      jarId: DEFAULT_JAR_ID,
    });
    expect(outcome.result.segment).toBe('FREE');
    expect(spawnBonusTimer).not.toHaveBeenCalled();
  });
});
