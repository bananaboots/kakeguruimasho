/**
 * Slider — shadcn-style primitive (vendored, trimmed, 3J).
 *
 * Single-thumb only (the stock shadcn Slider supports ranges; we don't need
 * that for wheel-probability sliders in Settings). Uses a native <input
 * type="range"> under the hood for keyboard + assistive-tech support, with
 * a custom visual layer stacked on top. This keeps us accessible with very
 * little code and no Radix dep.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './utils.ts';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onValueChange: (next: number) => void;
  'aria-label'?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    min = 0,
    max = 100,
    step = 1,
    value,
    onValueChange,
    className,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const clamped = Math.min(Math.max(value, min), max);
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  return (
    <label className={cn('slider', className)}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={(e) => onValueChange(Number(e.target.value))}
        aria-label={ariaLabel}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          cursor: 'pointer',
        }}
        {...rest}
      />
      <div className="slider__track">
        <div className="slider__range" style={{ width: `${pct}%` }} />
        <div className="slider__thumb" style={{ left: `${pct}%` }} />
      </div>
    </label>
  );
});
