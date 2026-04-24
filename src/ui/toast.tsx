/**
 * Toast — shadcn-style primitive (vendored, trimmed, 3J).
 *
 * Provider + `useToast()` hook + viewport. Pure React, no Radix.
 * Covers:
 *  - ephemeral toasts with auto-dismiss
 *  - "sticky" toasts with an action button (used by PwaUpdatePrompt —
 *    SPEC §9.1 / Q10/Q13: "New version available. [Reload]")
 *  - programmatic dismiss via returned id
 *
 * Wave 2 usage: `const { toast } = useToast(); toast({ title, description, action })`.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Ctx, type ToastId, type ToastInput } from './toast-context.ts';

interface ToastRecord extends ToastInput {
  id: ToastId;
}

let toastSerial = 0;
const makeId = (): ToastId => `t${++toastSerial}-${Date.now().toString(36)}`;

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<ToastId, number>>(new Map());

  const dismiss = useCallback((id: ToastId) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput): ToastId => {
      const id = makeId();
      const rec: ToastRecord = { id, ...input };
      setItems((arr) => [...arr, rec]);
      if (!input.action) {
        const ms = input.durationMs ?? 4000;
        const t = window.setTimeout(() => dismiss(id), ms);
        timers.current.set(id, t);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    return (): void => {
      for (const t of timers.current.values()) window.clearTimeout(t);
      timers.current.clear();
    };
  }, []);

  const ctx = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(<ToastViewport items={items} onDismiss={dismiss} />, document.body)
        : null}
    </Ctx.Provider>
  );
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastRecord[];
  onDismiss: (id: ToastId) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="toast__viewport" role="region" aria-label="Notifications">
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          aria-live={item.politeness ?? 'polite'}
          className={`toast${item.action ? ' toast--sticky' : ''}`}
        >
          <div className="toast__body">
            {item.title ? <div className="toast__title">{item.title}</div> : null}
            {item.description ? (
              <div className="toast__description">{item.description}</div>
            ) : null}
          </div>
          {item.action ? (
            <button
              type="button"
              className="btn btn--primary btn--size-sm"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
            >
              {item.action.label}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--ghost btn--size-sm"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(item.id)}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
