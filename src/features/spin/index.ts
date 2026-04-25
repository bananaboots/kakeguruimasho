/**
 * Spin feature — public surface (Wave 3, 3E).
 *
 * Everything here is UI-layer; no external contracts are consumed by other
 * agents. The route mounts `<SpinFlow>` which composes the pieces below.
 */

export { HandView } from './HandView.tsx';
export type { HandViewProps } from './HandView.tsx';

export { CashInPicker } from './CashInPicker.tsx';
export type { CashInPickerProps } from './CashInPicker.tsx';

export { SpinButton } from './SpinButton.tsx';
export type { SpinButtonProps } from './SpinButton.tsx';

export { GoldInstantT3Button } from './GoldInstantT3Button.tsx';
export type { GoldInstantT3ButtonProps } from './GoldInstantT3Button.tsx';

export { HandSummary } from './HandSummary.tsx';
export type { HandSummaryProps } from './HandSummary.tsx';

export { HandTrayCard } from './HandTrayCard.tsx';
export type { HandTrayCardProps } from './HandTrayCard.tsx';

export { PostSpinFlow } from './PostSpinFlow.tsx';
export type { PostSpinFlowProps } from './PostSpinFlow.tsx';

export {
  INITIAL_STATE as SPIN_MACHINE_INITIAL_STATE,
  reduce as spinMachineReduce,
  highestUnlockedTierForSpin,
  isCashInFrozen,
  withBonusPending,
} from './spin.machine.ts';
export type {
  SpinState,
  SpinEvent,
  SpinPhase,
  SpinSelection,
  CashInMatchKind,
  RewardSource,
} from './spin.machine.ts';
