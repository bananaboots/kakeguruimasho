/**
 * Drawer — bottom sheet at <1024px, 480px right-slide drawer at >=1024px.
 *
 * Built on Dialog so focus-trap, ESC, backdrop close, and aria wiring all
 * come for free. The mode swap is purely visual — the React tree, focus
 * management, and a11y semantics are identical at both widths.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  type DialogProps,
} from './dialog.tsx';
import { cn } from './utils.ts';
import { useIsDesktop } from '../lib/useIsDesktop.ts';

export function Drawer(props: DialogProps) {
  return <Dialog {...props} />;
}

interface DrawerContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function DrawerContent({ className, children, ...rest }: DrawerContentProps) {
  const isDesktop = useIsDesktop();
  const modeClass = isDesktop ? 'drawer__content--right' : 'drawer__content--bottom';
  return (
    <DialogContent className={cn('drawer__content', modeClass, className)} {...rest}>
      {children}
    </DialogContent>
  );
}

export {
  DialogTitle as DrawerTitle,
  DialogDescription as DrawerDescription,
  DialogClose as DrawerClose,
};
