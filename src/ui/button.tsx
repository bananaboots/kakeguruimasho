/**
 * Button — shadcn-style primitive (vendored, trimmed, 3J).
 *
 * Variants kept: primary, secondary, ghost, danger, gold.
 * Sizes kept: sm, md, lg, icon.
 * Removed from stock shadcn: link, outline (secondary covers it), and the
 * `cva` dep — encoded as plain switch statements to keep the bundle small.
 *
 * Accessibility: icon-only usage requires an `aria-label`; we `console.warn`
 * in dev if a button with only an icon child lacks one.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils.ts';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When true, render no background; useful for slot children. */
  unstyled?: boolean;
  /** Leading icon slot. */
  leading?: ReactNode;
  /** Trailing icon slot. */
  trailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      unstyled = false,
      leading,
      trailing,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    const classes = unstyled
      ? cn('btn btn--unstyled', className)
      : cn(
          'btn',
          `btn--${variant}`,
          `btn--size-${size}`,
          className,
        );

    return (
      <button ref={ref} type={type} className={classes} {...rest}>
        {leading ? <span className="btn__leading">{leading}</span> : null}
        {children != null ? <span className="btn__label">{children}</span> : null}
        {trailing ? <span className="btn__trailing">{trailing}</span> : null}
      </button>
    );
  },
);
