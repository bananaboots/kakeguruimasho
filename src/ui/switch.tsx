/**
 * Switch — shadcn-style primitive (vendored, trimmed, 3J).
 *
 * Controlled-only (`checked` + `onCheckedChange`) — simpler than the stock
 * shadcn variant. Used by 3I for the SFX / haptics toggles.
 *
 * a11y: role="switch" + aria-checked. Keyboard: Space/Enter toggle.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './utils.ts';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Required a11y label unless surrounded by a <label> wrapper. */
  'aria-label'?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, className, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn('switch', className)}
      {...rest}
    >
      <span className="switch__knob" />
    </button>
  );
});
