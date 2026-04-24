/**
 * Toast context + hook + types.
 *
 * Split out of `toast.tsx` so the TSX module only exports components
 * (satisfies react-refresh/only-export-components).
 */

import { createContext, useContext, type ReactNode } from 'react';

export type ToastId = string;

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  title?: ReactNode;
  description?: ReactNode;
  /** When provided, toast is sticky — does NOT auto-dismiss. */
  action?: ToastAction;
  /** Auto-dismiss delay in ms. Ignored if `action` present. Default 4000. */
  durationMs?: number;
  /** Accessibility announcer politeness. Default "polite". */
  politeness?: 'polite' | 'assertive';
}

export type ToastCtx = {
  toast: (t: ToastInput) => ToastId;
  dismiss: (id: ToastId) => void;
};

export const Ctx = createContext<ToastCtx | null>(null);

/**
 * Access the app-wide toast queue. Throws if called outside `<ToastProvider>`
 * so missing-provider bugs fail loudly at mount rather than silently dropping
 * toasts.
 */
export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used within <ToastProvider>');
  return v;
}
