/**
 * Input — shadcn-style primitive (vendored, trimmed, 3J).
 * Thin wrapper around <input> so callers don't need to repeat the class
 * and can lean on the `input` CSS token block.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './utils.ts';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...rest },
  ref,
) {
  return <input ref={ref} type={type} className={cn('input', className)} {...rest} />;
});
