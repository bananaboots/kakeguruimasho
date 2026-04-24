/**
 * StepEntry — numeric-input modal for count-unit habits (walk) (3D).
 *
 * PLANNING §6.4: entering 11,300 steps should award `floor(11300/2500) = 4`
 * clips as ONE batched `completeHabit(walkHabitId, 4)` call so the user
 * doesn't feel punished by N taps.
 *
 * Edge cases (brief §3):
 * - 0 steps → 0 clips, Log button disabled
 * - non-integer / negative / NaN → Log button disabled
 *
 * Accessibility (brief §4):
 * - label the input
 * - `aria-live="polite"` announces the computed clip count as the user types
 *
 * Animation: on confirm, render N clip icons that scale + translate toward
 * the "hand" summary — CSS keyframes, no Framer Motion (brief §5).
 */

import { useCallback, useMemo, useState } from 'react';
import { Button } from '../../ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog.tsx';
import { Input } from '../../ui/input.tsx';
import { getAppStore } from '../../state/store.ts';
import type { Habit } from '../../types/habit.ts';

export interface StepEntryProps {
  habit: Habit; // must have unit.kind === 'count'
  open: boolean;
  onClose: () => void;
}

const STEPS_PER_CLIP_FALLBACK = 2500;

export function StepEntry({ habit, open, onClose }: StepEntryProps) {
  const [rawValue, setRawValue] = useState('');
  const [awarded, setAwarded] = useState<number | null>(null);

  const target =
    habit.unit.kind === 'count' && habit.unit.target > 0
      ? habit.unit.target
      : STEPS_PER_CLIP_FALLBACK;

  const { isValid, clips, stepsN } = useMemo(() => {
    const trimmed = rawValue.trim();
    if (trimmed === '') return { isValid: false, clips: 0, stepsN: NaN };
    // integer-only (brief §3).
    if (!/^\d+$/.test(trimmed)) return { isValid: false, clips: 0, stepsN: NaN };
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      return { isValid: false, clips: 0, stepsN: NaN };
    }
    return { isValid: true, clips: Math.floor(n / target), stepsN: n };
  }, [rawValue, target]);

  const canLog = isValid && clips > 0;

  const handleLog = useCallback(() => {
    if (!canLog) return;
    const { actions } = getAppStore().getState();
    const result = actions.completeHabit(habit.id, clips);
    setAwarded(result.clipsEarned);
    // Auto-dismiss after the clip-fly animation completes (~800ms).
    window.setTimeout(() => {
      setRawValue('');
      setAwarded(null);
      onClose();
    }, 800);
  }, [canLog, clips, habit.id, onClose]);

  const handleCancel = useCallback(() => {
    setRawValue('');
    setAwarded(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleCancel() : undefined)}>
      <DialogContent>
        <DialogTitle>Log {habit.name}</DialogTitle>
        <DialogDescription>
          {target.toLocaleString()} steps per clip. Enter today&apos;s step count.
        </DialogDescription>

        <div className="step-entry__field">
          <label htmlFor="step-entry-input" className="step-entry__label">
            Steps today
          </label>
          <Input
            id="step-entry-input"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            step={1}
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            placeholder="0"
            autoFocus
            aria-describedby="step-entry-clips"
          />
        </div>

        <p
          id="step-entry-clips"
          className="step-entry__preview"
          aria-live="polite"
        >
          {!isValid && rawValue.trim() !== '' ? (
            <span className="step-entry__preview-hint">
              Enter a whole number of steps.
            </span>
          ) : clips > 0 ? (
            <>
              <strong>
                {clips} clip{clips === 1 ? '' : 's'}
              </strong>{' '}
              from {stepsN.toLocaleString()} steps
            </>
          ) : (
            <span className="step-entry__preview-hint">
              Need at least {target.toLocaleString()} steps for 1 clip.
            </span>
          )}
        </p>

        {awarded !== null ? (
          <div
            className="step-entry__fly-stage"
            role="status"
            aria-live="polite"
            aria-label={`Earned ${awarded} clip${awarded === 1 ? '' : 's'}`}
          >
            {Array.from({ length: awarded }, (_, i) => (
              <span
                key={i}
                className="step-entry__fly-clip"
                style={{ animationDelay: `${i * 60}ms` }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : null}

        <div className="step-entry__actions">
          <Button variant="ghost" onClick={handleCancel} disabled={awarded !== null}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleLog}
            disabled={!canLog || awarded !== null}
          >
            {awarded !== null
              ? `Earned ${awarded}!`
              : `Log ${clips || 0} clip${clips === 1 ? '' : 's'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
