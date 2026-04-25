/**
 * BrassButton — vintage primary CTA with embossed brass face.
 *
 * Two variants:
 *  - `primary`: brass gradient, dark embossed text — the "pull the lever" CTA.
 *  - `ghost`:   transparent body with hairline gold border — secondary actions.
 *
 * Sized for thumb reach on mobile (`min-height: 44px` per SPEC §4).
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type BrassButtonVariant = 'primary' | 'ghost';
export type BrassButtonSize = 'sm' | 'md' | 'lg';

export interface BrassButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: BrassButtonVariant;
  size?: BrassButtonSize;
  fullWidth?: boolean;
}

const PADS: Record<BrassButtonSize, string> = {
  sm: '8px 14px',
  md: '12px 22px',
  lg: '16px 28px',
};

const FONTS: Record<BrassButtonSize, number> = {
  sm: 11,
  md: 13,
  lg: 15,
};

export const BrassButton = forwardRef<HTMLButtonElement, BrassButtonProps>(
  function BrassButton(
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      style,
      className,
      ...rest
    },
    ref,
  ) {
    const isPrimary = variant === 'primary';
    return (
      <button
        ref={ref}
        className={className}
        {...rest}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: `calc(${FONTS[size]}px * var(--mono-scale))`,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          padding: PADS[size],
          border: 'none',
          cursor: rest.disabled ? 'not-allowed' : 'pointer',
          borderRadius: 2,
          width: fullWidth ? '100%' : undefined,
          minHeight: 44,
          background: isPrimary
            ? 'linear-gradient(180deg, var(--color-gold) 0%, var(--color-gold-deep) 100%)'
            : 'transparent',
          color: isPrimary ? 'var(--color-accent-contrast)' : 'var(--color-gold)',
          boxShadow: isPrimary
            ? 'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.3), 0 1px 0 var(--color-bg), 0 2px 0 rgba(0, 0, 0, 0.5)'
            : 'inset 0 0 0 1px var(--color-border-strong)',
          opacity: rest.disabled ? 0.4 : 1,
          transition:
            'transform var(--duration-fast) var(--ease-out), filter var(--duration-fast) var(--ease-out)',
          ...style,
        }}
      >
        {children}
      </button>
    );
  },
);
