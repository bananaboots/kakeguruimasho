/**
 * Bonus feature barrel (3H).
 *
 * Re-exports components, the FSM classifier, and the expire-sweep entry
 * point. Consumed by `App.tsx` and `routes/BonusTimerDetail.tsx`.
 */

import './bonus.css';

export { BonusTimerBanner } from './BonusTimerBanner.tsx';
export { BonusTimerCountdown } from './BonusTimerCountdown.tsx';
export { formatRemaining } from './BonusTimerCountdown.util.ts';
export { DiscountHabitPicker } from './DiscountHabitPicker.tsx';
export { JustALittleBitMore } from './JustALittleBitMore.tsx';
export { discountTarget, unitWord } from './JustALittleBitMore.util.ts';
export {
  classifyBonusState,
  oldestActiveTimer,
  type BonusMachineState,
  type BonusMachineInput,
} from './bonus.machine.ts';
export { expireCheck, type ExpireCheckResult } from './expireCheck.ts';
