/**
 * Dialog — shadcn-style primitive (vendored, trimmed, 3J).
 *
 * Minimal pure-React implementation (no Radix dep yet). Covers the surface
 * Wave 2 will actually use: open/close, overlay, title, description, close.
 * Skipped: DialogFooter, DialogTrigger-as-asChild (callers manage their own
 * trigger buttons), portal target customization.
 *
 * A11y: traps focus in the content while open, restores focus on close,
 * closes on Escape. Portaled to `document.body`.
 *
 * When Radix lands (`WAVE1_3J_DEPS.txt`), swap implementation behind this
 * same API — consumers won't change.
 */

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from './utils.ts';
import { Button } from './button.tsx';

type DialogCtx = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  titleId: string;
  descriptionId: string;
};

const Ctx = createContext<DialogCtx | null>(null);
const useDialogCtx = (): DialogCtx => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Dialog.* used outside <Dialog>');
  return v;
};

export interface DialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Ctx.Provider value={{ open, onOpenChange, titleId, descriptionId }}>
      {children}
    </Ctx.Provider>
  );
}

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  /** If true, Escape will NOT close the dialog. Use sparingly. */
  disableEscape?: boolean;
  /** If true, click on overlay will NOT close. */
  disableOverlayClose?: boolean;
}

export function DialogContent({
  disableEscape = false,
  disableOverlayClose = false,
  className,
  children,
  ...rest
}: DialogContentProps) {
  const { open, onOpenChange, titleId, descriptionId } = useDialogCtx();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Stable ref-carried callbacks so the focus-trap effect can depend ONLY on
  // `open`. This was the Wave 2/3/4 keystroke-loss bug: callers pass fresh
  // `onOpenChange` closures per render, which (before) re-ran the focus
  // effect — re-focusing the dialog div — and yanked focus from whatever
  // controlled `<input>` the user was typing into. See 3F + 3I notes.
  //
  // Refs are written in an effect rather than during render to satisfy
  // react-hooks/refs ("Cannot update ref during render").
  const onOpenChangeRef = useRef(onOpenChange);
  const disableEscapeRef = useRef(disableEscape);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
    disableEscapeRef.current = disableEscape;
  });

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus the dialog ONCE on open so keyboard users land inside. After that
    // we never touch focus again — controlled inputs inside the dialog keep
    // their focus naturally as the user types.
    const focusTimer = window.setTimeout(() => {
      contentRef.current?.focus();
    }, 0);

    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !disableEscapeRef.current) {
        e.stopPropagation();
        onOpenChangeRef.current(false);
        return;
      }
      if (e.key === 'Tab' && contentRef.current) {
        const focusables = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return (): void => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
    // Intentionally ONLY depends on `open`. See comment above.
  }, [open]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="dialog__overlay"
        onClick={disableOverlayClose ? undefined : () => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn('dialog__content', className)}
        {...rest}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export function DialogTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogCtx();
  return (
    <h2 id={titleId} className={cn('dialog__title', className)} {...rest}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogCtx();
  return (
    <p id={descriptionId} className={cn('dialog__description', className)} {...rest}>
      {children}
    </p>
  );
}

export function DialogClose({ children = '×' }: { children?: ReactNode }) {
  const { onOpenChange } = useDialogCtx();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="dialog__close"
      aria-label="Close dialog"
      onClick={() => onOpenChange(false)}
    >
      {children}
    </Button>
  );
}
