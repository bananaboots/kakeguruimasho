/**
 * SpinButton — large tap target that kicks off the main wheel (Wave 3, 3E).
 *
 * Disabled until the user has either made a match selection or explicitly
 * skipped cash-in. The parent owns the "confirmed" state; this component is
 * dumb: it renders + forwards the click.
 *
 * Default label pulls from the active theme's `copy.spinCta`
 * ("Pull the Lever" for Vintage Pachinko, etc.). The parent can still
 * override with `label="Spinning…"` during the cash-in freeze.
 */

import type { ReactElement } from 'react';

import { useTheme } from '../../styles/theme-context.ts';
import './spin.css';

export type SpinButtonProps = {
  onSpin: () => void;
  /**
   * When true (A9 post-tap or the user hasn't confirmed cash-in yet), the
   * button is disabled. The parent disambiguates the two disabled reasons in
   * its copy.
   */
  disabled?: boolean;
  /** Label override — when omitted, uses the active theme's `copy.spinCta`. */
  label?: string;
  className?: string;
};

export function SpinButton({
  onSpin,
  disabled = false,
  label,
  className,
}: SpinButtonProps): ReactElement {
  const { themeMeta } = useTheme();
  const resolvedLabel = label ?? themeMeta.copy.spinCta;
  return (
    <button
      type="button"
      onClick={onSpin}
      disabled={disabled}
      className={cn('spin-button', disabled && 'spin-button--disabled', className)}
      data-testid="spin-button"
      aria-disabled={disabled || undefined}
    >
      <span className="spin-button__knob" aria-hidden>
        <span className="spin-button__knob-mark">◆</span>
      </span>
      <span className="spin-button__track">
        <span className="spin-button__label">{resolvedLabel}</span>
        <span className="spin-button__rail" aria-hidden />
      </span>
    </button>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export default SpinButton;
