/**
 * Tabs — shadcn-style primitive (vendored, trimmed, 3J).
 *
 * Pure React implementation. Supports controlled `value` + `onValueChange`
 * or uncontrolled via `defaultValue`. Keyboard: ArrowLeft/ArrowRight move
 * between triggers; Home/End jump to first/last. Selection follows focus
 * (matches shadcn default).
 *
 * Rewards route (3F) uses this with three triggers: T1 / T2 / T3.
 */

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type HTMLAttributes,
} from 'react';
import { cn } from './utils.ts';

type TabsCtx = {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
  registerTrigger: (v: string, el: HTMLButtonElement | null) => void;
};
const Ctx = createContext<TabsCtx | null>(null);
const useTabsCtx = (): TabsCtx => {
  const v = useContext(Ctx);
  if (!v) throw new Error('Tabs.* used outside <Tabs>');
  return v;
};

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value: controlled,
  defaultValue,
  onValueChange,
  className,
  children,
  ...rest
}: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const value = controlled ?? internal;
  const baseId = useId();
  const triggers = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setValue = useCallback(
    (next: string) => {
      if (controlled === undefined) setInternal(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );

  const registerTrigger = useCallback(
    (v: string, el: HTMLButtonElement | null) => {
      if (el) triggers.current.set(v, el);
      else triggers.current.delete(v);
    },
    [],
  );

  return (
    <Ctx.Provider value={{ value, setValue, baseId, registerTrigger }}>
      <div className={cn('tabs', className)} {...rest}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function TabsList({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="tablist" className={cn('tabs__list', className)} {...rest}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

export function TabsTrigger({
  value,
  disabled = false,
  className,
  children,
  ...rest
}: TabsTriggerProps) {
  const { value: active, setValue, baseId, registerTrigger } = useTabsCtx();
  const isActive = active === value;
  const triggerId = `${baseId}-trigger-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    const list = e.currentTarget.parentElement;
    if (!list) return;
    const items = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'),
    );
    const idx = items.indexOf(e.currentTarget);
    let next: HTMLButtonElement | undefined;
    if (e.key === 'ArrowRight') next = items[(idx + 1) % items.length];
    else if (e.key === 'ArrowLeft') next = items[(idx - 1 + items.length) % items.length];
    else if (e.key === 'Home') next = items[0];
    else if (e.key === 'End') next = items[items.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
      setValue(next.dataset['value'] ?? value);
    }
  };

  return (
    <button
      type="button"
      role="tab"
      id={triggerId}
      data-value={value}
      data-state={isActive ? 'active' : 'inactive'}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      onKeyDown={onKeyDown}
      ref={(el) => registerTrigger(value, el)}
      className={cn('tabs__trigger', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...rest }: TabsContentProps) {
  const { value: active, baseId } = useTabsCtx();
  const state = active === value ? 'active' : 'inactive';
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      data-state={state}
      className={cn('tabs__panel', className)}
      tabIndex={0}
      {...rest}
    >
      {children}
    </div>
  );
}
