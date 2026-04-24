/**
 * SpinButton — large tap target that kicks off the main wheel (Wave 3, 3E).
 *
 * Disabled until the user has either made a match selection or explicitly
 * skipped cash-in. The parent owns the "confirmed" state; this component is
 * dumb: it renders + forwards the click.
 */

import type { ReactElement } from 'react';

import './spin.css';

export type SpinButtonProps = {
  onSpin: () => void;
  /**
   * When true (A9 post-tap or the user hasn't confirmed cash-in yet), the
   * button is disabled. The parent disambiguates the two disabled reasons in
   * its copy.
   */
  disabled?: boolean;
  /** Label override — lets the parent say "Spinning…" during cashInFrozen. */
  label?: string;
  className?: string;
};

export function SpinButton({
  onSpin,
  disabled = false,
  label = 'Spin',
  className,
}: SpinButtonProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onSpin}
      disabled={disabled}
      className={cn('spin-button', disabled && 'spin-button--disabled', className)}
      data-testid="spin-button"
      aria-disabled={disabled || undefined}
    >
      <span className="spin-button__label">{label}</span>
    </button>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export default SpinButton;
