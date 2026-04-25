// Public wheel-feature surface. 3E and downstream agents import from here.

export {
  resolveMainSpin,
  resolveBonusSpin,
  mainSegmentIndex,
  bonusSegmentIndex,
  MAIN_WHEEL_SEGMENT_ORDER,
  BONUS_WHEEL_SEGMENT_ORDER,
} from './wheel.engine.ts';

export {
  chooseNearMissDrift,
  isLosingSpin,
  lockedTiers,
} from './near-miss.ts';

export {
  spinMainWheel,
  spinBonusWheel,
  type SpinActions,
  type SpinMainWheelOpts,
  type SpinMainWheelOutcome,
  type SpinBonusWheelOpts,
  type SpinBonusWheelOutcome,
} from './spin-orchestrator.ts';

export { WheelCanvas, type WheelCanvasProps } from './WheelCanvas.tsx';
export {
  BonusWheelCanvas,
  type BonusWheelCanvasProps,
} from './BonusWheelCanvas.tsx';

export { SlotReelsCanvas, type SlotReelsCanvasProps } from './SlotReelsCanvas.tsx';

export {
  MAIN_WHEEL_SPIN_DURATION_SEC,
  BONUS_WHEEL_SPIN_DURATION_SEC,
  WIN_PULSE_DURATION_SEC,
  MAIN_WHEEL_REVOLUTIONS,
  BONUS_WHEEL_REVOLUTIONS,
  NEAR_MISS_OVERSHOOT_FACTOR,
} from './animation-constants.ts';

export { createSfx, noopSfx, type Sfx, type SfxEnabledGetter } from './sfx.ts';
