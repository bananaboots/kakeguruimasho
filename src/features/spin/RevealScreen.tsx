/**
 * RevealScreen — Spin Step III ("Reward Reveal") rendered as a full-page
 * sub-route under `/spin/reveal`.
 *
 * Replaces the modal popover that used to sit on top of the spin flow with
 * an inline page. Same content (rays, confetti, banner, picker) but the
 * picker list is part of the page rather than wrapped in a `<Dialog>`.
 *
 * Source: `pachinko-screens.jsx:744–856`.
 */

import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';

import { Button } from '../../ui/button.tsx';
import type { RewardId } from '../../types/ids.ts';
import type { Tier } from '../../types/wheel.ts';
import { useAppStore } from '../../state/store.ts';
import { addReward } from '../../state/slices/rewards.ts';
import { applyRewardMutation } from '../rewards/reward-actions.ts';
import { newRewardId } from '../../lib/id.ts';
import { nowISO } from '../../lib/time.ts';
import { RewardEditor } from '../rewards/RewardEditor.tsx';
import { RevealStage } from './RevealStage.tsx';
import '../rewards/rewards.css';

export interface RevealScreenProps {
  tier: Tier;
  onPick: (rewardId: RewardId) => void;
  onDismiss: () => void;
}

export function RevealScreen({
  tier,
  onPick,
  onDismiss,
}: RevealScreenProps): ReactElement {
  const rewards = useAppStore((s) => s.rewards[tier]);
  const visible = useMemo(() => rewards.filter((r) => !r.archived), [rewards]);
  const isEmpty = visible.length === 0;

  const [addOpen, setAddOpen] = useState(false);
  const [userSelectedId, setUserSelectedId] = useState<RewardId | null>(null);

  // Pre-select the first reward whenever the visible list shifts so the
  // "Claim · X" CTA always reads against a real label (matches design intent).
  // Derived rather than synced via useEffect — no cascading renders.
  const selectedId = useMemo<RewardId | null>(() => {
    if (
      userSelectedId !== null &&
      visible.some((r) => r.id === userSelectedId)
    ) {
      return userSelectedId;
    }
    return visible.length > 0 ? visible[0]!.id : null;
  }, [userSelectedId, visible]);

  const handleSelect = useCallback((id: RewardId): void => {
    setUserSelectedId(id);
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLLIElement>, id: RewardId): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setUserSelectedId(id);
      }
    },
    [],
  );

  const handleClaim = useCallback((): void => {
    if (selectedId === null) return;
    onPick(selectedId);
  }, [selectedId, onPick]);

  const handleAdd = useCallback(
    (label: string): void => {
      const reward = {
        id: newRewardId(),
        tier,
        label,
        createdAt: nowISO(),
        archived: false,
      };
      applyRewardMutation((s) => addReward(s, reward));
      setAddOpen(false);
    },
    [tier],
  );

  const selectedLabel = useMemo(() => {
    if (selectedId === null) return null;
    return visible.find((r) => r.id === selectedId)?.label ?? null;
  }, [selectedId, visible]);

  return (
    <section
      className="reveal-screen"
      data-testid="reveal-screen"
      data-tier={tier}
      aria-labelledby="reveal-screen-banner"
    >
      <RevealStage tier={tier} />

      {isEmpty ? (
        <div className="reveal-screen__empty">
          <p className="reveal-screen__empty-copy">
            No {tier} rewards yet. Add one or skip.
          </p>
          <div className="reveal-screen__empty-actions">
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              Add reward
            </Button>
            <Button variant="ghost" onClick={onDismiss}>
              Skip (forfeit)
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ul
            role="listbox"
            aria-label={`${tier} rewards`}
            className="reveal-screen__list"
          >
            {visible.map((r) => (
              <li
                key={r.id}
                role="option"
                aria-selected={r.id === selectedId}
                tabIndex={0}
                className="reveal-screen__option"
                data-selected={r.id === selectedId}
                onClick={() => handleSelect(r.id)}
                onKeyDown={(e) => handleKey(e, r.id)}
              >
                {r.label}
              </li>
            ))}
          </ul>
          <div className="reveal-screen__actions">
            <Button
              variant="primary"
              size="lg"
              className="reveal-screen__claim"
              onClick={handleClaim}
              disabled={selectedId === null}
            >
              {selectedLabel !== null
                ? `Claim · ${selectedLabel}`
                : 'Claim reward'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Skip (forfeit)
            </Button>
          </div>
        </>
      )}

      <RewardEditor
        open={addOpen}
        title={`Add ${tier} reward`}
        initialLabel=""
        onSubmit={handleAdd}
        onCancel={() => setAddOpen(false)}
      />
    </section>
  );
}
