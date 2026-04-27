/**
 * BonusTimerCountdown — `endTimestamp`-driven countdown (3H).
 *
 * R1 in ARCHITECTURE §10: `endTimestamp - Date.now()` is the ONLY source of
 * truth. We never accumulate time via `setInterval`. A `requestAnimationFrame`
 * loop recomputes the remaining value roughly each frame while the tab is
 * visible; on `visibilitychange` we re-sync immediately. Closing the PWA and
 * coming back later shows the correct remaining because we re-read `Date.now()`
 * every render tick.
 *
 * Expiration: when remaining drops ≤ 0 we call `onExpire` once. The store
 * action is invoked by the caller (not here) so this component stays as pure
 * UI — tests can mount it without a full store.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ISOTimestamp } from '../../types/ids.ts';
import { formatRemaining } from './BonusTimerCountdown.util.ts';
import { useTheme } from '../../styles/theme-context.ts';
import { CRTBezel } from '../../ui/kowloon/CRTBezel.tsx';
import '../kowloon/kowloon-screens.css';

export interface BonusTimerCountdownProps {
  /** Authoritative end timestamp as ISO. */
  endTimestamp: ISOTimestamp;
  /** Fires at most once when remaining crosses ≤ 0. */
  onExpire?: () => void;
  /** Optional className on the wrapper for layout variants. */
  className?: string;
  /** When true, render a compact single-line `m:ss` instead of the full frame. */
  compact?: boolean;
  /** Extra descriptive text rendered next to the countdown (e.g. habit name). */
  children?: React.ReactNode;
}

function computeRemainingMs(endTs: string): number {
  return Math.max(0, Date.parse(endTs) - Date.now());
}

export function BonusTimerCountdown({
  endTimestamp,
  onExpire,
  className,
  compact = false,
  children,
}: BonusTimerCountdownProps) {
  const { themeMeta } = useTheme();
  const isKowloon = themeMeta.visual?.overlay === 'scanlines';

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    computeRemainingMs(endTimestamp),
  );
  const expiredRef = useRef<boolean>(false);
  const frameRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const next = computeRemainingMs(endTimestamp);
    // Functional updater + equality check avoids a setState that is a no-op
    // and keeps this callback safe to invoke from effects / rAF callbacks.
    setRemainingMs((prev) => (prev === next ? prev : next));
  }, [endTimestamp]);

  // Reset the expired-fired guard whenever the target end-timestamp changes.
  // The rAF effect below re-runs on endTimestamp change and calls `tick()`,
  // which handles the re-sync of `remainingMs`.
  useEffect(() => {
    expiredRef.current = false;
  }, [endTimestamp]);

  // Drive `onExpire` off the reactive `remainingMs` state so we're not
  // dependent on rAF firing under fake clocks.
  useEffect(() => {
    if (remainingMs <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      if (onExpire) onExpire();
    }
  }, [remainingMs, onExpire]);

  useEffect(() => {
    let cancelled = false;

    const loop = () => {
      if (cancelled) return;
      tick();
      // Only keep scheduling while visible; visibilitychange handles re-entry.
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        frameRef.current = window.requestAnimationFrame(loop);
      }
    };

    const onVisibility = () => {
      // Immediate recompute — authoritative via Date.now() no matter how long
      // the tab was backgrounded.
      tick();
      if (
        document.visibilityState === 'visible' &&
        frameRef.current == null
      ) {
        frameRef.current = window.requestAnimationFrame(loop);
      }
    };

    // Kick off once.
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
    ) {
      frameRef.current = window.requestAnimationFrame(loop);
    } else {
      // Defer to avoid a synchronous setState inside this effect. The tab is
      // hidden, so rAF won't run — we still need one fresh render when it
      // returns visible, which `onVisibility` handles.
      queueMicrotask(() => {
        if (!cancelled) tick();
      });
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tick]);

  const label = formatRemaining(remainingMs);
  const minutesLeft = Math.floor(remainingMs / 60000);

  const wrapperClass =
    `bonus-countdown${compact ? ' bonus-countdown--compact' : ''}` +
    (className ? ` ${className}` : '');

  if (isKowloon) {
    return (
      <CRTBezel label="BONUS · ACTIVE" tally width="100%" height={140}>
        <div
          role="timer"
          aria-live="off"
          aria-label={
            remainingMs > 0
              ? `${minutesLeft} minutes left`
              : 'Bonus timer expired'
          }
          className="bonus-countdown--kowloon"
          data-testid="bonus-countdown"
        >
          <span className="bonus-countdown--kowloon__digits">{label}</span>
          {children ? (
            <span className="bonus-countdown--kowloon__sublabel">
              {children}
            </span>
          ) : null}
        </div>
      </CRTBezel>
    );
  }

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={
        remainingMs > 0
          ? `${minutesLeft} minutes left`
          : 'Bonus timer expired'
      }
      className={wrapperClass}
      data-testid="bonus-countdown"
    >
      <span className="bonus-countdown__value">{label}</span>
      {children ? (
        <span className="bonus-countdown__label">{children}</span>
      ) : null}
    </span>
  );
}
