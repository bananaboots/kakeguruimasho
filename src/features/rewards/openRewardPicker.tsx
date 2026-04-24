/**
 * openRewardPicker — imperative portal-mounted picker for 3E (cash-in & spin
 * flow) to `await` on wheel win.
 *
 * Semantics:
 *   - Resolves with the picked RewardId.
 *   - Resolves with `null` on dismiss/forfeit (OR-3: empty state + skip, or
 *     user closed via Escape / overlay click).
 *   - Idempotent-safe: if called while a picker is already open, resolves
 *     the prior promise with `null` (treated as forfeit) BEFORE opening the
 *     new one. This matches spec 11 "no dead ends" — a stale modal should
 *     never trap flow.
 *
 * Implementation: a single singleton React root is mounted on
 * `document.body` on first call and re-used for subsequent calls.
 */

import { createRoot, type Root } from 'react-dom/client';
import type { RewardId } from '../../types/ids.ts';
import type { Tier } from '../../types/wheel.ts';
import { RewardPickerModal } from './RewardPickerModal.tsx';

type Pending = {
  resolve: (result: RewardId | null) => void;
};

let hostEl: HTMLDivElement | null = null;
let root: Root | null = null;
let pending: Pending | null = null;

function ensureHost(): { host: HTMLDivElement; root: Root } {
  if (typeof document === 'undefined') {
    throw new Error('openRewardPicker requires a DOM; called in non-browser context');
  }
  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.setAttribute('data-reward-picker-host', '');
    document.body.appendChild(hostEl);
  }
  if (!root) {
    root = createRoot(hostEl);
  }
  return { host: hostEl, root };
}

function renderClosed(): void {
  const { root } = ensureHost();
  root.render(null);
}

function renderOpen(tier: Tier, onPick: (id: RewardId) => void, onDismiss: () => void): void {
  const { root } = ensureHost();
  root.render(
    <RewardPickerModal tier={tier} open={true} onPick={onPick} onDismiss={onDismiss} />,
  );
}

/**
 * Open the reward-picker modal for `tier`. Returns a promise that resolves
 * when the user picks a reward (RewardId) or dismisses/forfeits (null).
 *
 * If called while an earlier picker is still open, the earlier promise is
 * resolved with `null` (forfeit) and a new picker opens for `tier`.
 */
export function openRewardPicker(tier: Tier): Promise<RewardId | null> {
  // Idempotent-safe: resolve any prior pending promise as forfeit.
  if (pending) {
    const prev = pending;
    pending = null;
    prev.resolve(null);
  }

  return new Promise<RewardId | null>((resolve) => {
    pending = { resolve };

    const finish = (result: RewardId | null): void => {
      if (!pending) return;
      const p = pending;
      pending = null;
      renderClosed();
      p.resolve(result);
    };

    renderOpen(
      tier,
      (id) => finish(id),
      () => finish(null),
    );
  });
}

/**
 * Test-only: tear down any mounted host. Vitest's jsdom reuses the
 * document across tests, so this keeps tests independent.
 */
export function __resetRewardPickerForTests(): void {
  if (pending) {
    const p = pending;
    pending = null;
    p.resolve(null);
  }
  if (root) {
    try {
      root.unmount();
    } catch {
      /* no-op */
    }
    root = null;
  }
  if (hostEl && hostEl.parentNode) {
    hostEl.parentNode.removeChild(hostEl);
  }
  hostEl = null;
}
