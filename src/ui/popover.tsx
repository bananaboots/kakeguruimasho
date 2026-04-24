/**
 * Popover — shadcn-style primitive (vendored, trimmed, 3J).
 *
 * Minimal controlled popover. Positions relative to a trigger element by
 * wrapping both in a relative container. For v1 we don't need Radix's
 * collision detection — callers will use this mostly for info chips and
 * small settings affordances.
 *
 * a11y: toggles `aria-expanded` on the trigger. Closes on outside click +
 * Escape. Focus moves into popover on open.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from './utils.ts';

type PopoverCtx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  contentId: string;
};

const Ctx = createContext<PopoverCtx | null>(null);
const usePopoverCtx = (): PopoverCtx => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Popover.* used outside <Popover>');
  return v;
};

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Popover({ open: controlled, onOpenChange, defaultOpen = false, children }: PopoverProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const open = controlled ?? internal;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const contentId = useId();

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setInternal(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent): void => {
      const tgt = e.target as Node | null;
      if (!tgt) return;
      if (contentRef.current?.contains(tgt)) return;
      if (triggerRef.current?.contains(tgt)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return (): void => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  const value = useMemo(
    () => ({ open, setOpen, triggerRef, contentRef, contentId }),
    [open, setOpen, contentId],
  );

  return (
    <Ctx.Provider value={value}>
      <span style={{ position: 'relative', display: 'inline-block' }}>{children}</span>
    </Ctx.Provider>
  );
}

export function PopoverTrigger({
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerRef, contentId } = usePopoverCtx();
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      className={className}
      onClick={() => setOpen(!open)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PopoverContent({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { open, contentRef, contentId } = usePopoverCtx();
  if (!open) return null;
  return (
    <div
      ref={contentRef}
      id={contentId}
      role="dialog"
      className={cn('popover', className)}
      style={{ top: 'calc(100% + 8px)', left: 0 }}
      {...rest}
    >
      {children}
    </div>
  );
}
