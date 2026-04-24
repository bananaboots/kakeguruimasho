// Wheel animation timing + physics constants.
// Pulled out so 3E (spin FSM) can read them for state-machine timeouts
// without importing the canvas module (which pulls framer-motion).

/** Spec §12: "4–6 second spin." We target 5.0s for the main wheel. */
export const MAIN_WHEEL_SPIN_DURATION_SEC = 5.0;

/** Bonus wheel is smaller + repeated (EXTRA chain) — shave a second off. */
export const BONUS_WHEEL_SPIN_DURATION_SEC = 4.0;

/** Winning segment pulse ("settle" cue). */
export const WIN_PULSE_DURATION_SEC = 0.75;

/** Number of extra 360° revolutions before decelerating. More = more drama. */
export const MAIN_WHEEL_REVOLUTIONS = 5;
export const BONUS_WHEEL_REVOLUTIONS = 4;

/**
 * When a D3 drift is scheduled, we overshoot the target by this many
 * segments-worth of rotation so the pointer visually "passes" the drift
 * segment before easing back. 1 full extra segment = 360/N degrees where
 * N is the segment count.
 */
export const NEAR_MISS_OVERSHOOT_FACTOR = 1.5;
