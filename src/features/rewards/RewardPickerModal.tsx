/**
 * RewardPickerModal — invoked on a wheel win. User picks ONE reward from
 * the unlocked tier's menu.
 *
 * Props shape is locked by 3F brief:
 *   { tier, open, onPick(rewardId), onDismiss }
 *
 * - Archived rewards are filtered out (OR-3 "user picks from list").
 * - OR-3 empty state: if every reward in the tier is archived, or the tier
 *   has zero entries, show the empty-state with "Add reward" and
 *   "Skip (forfeit)" buttons. "Skip" calls `onDismiss`; upstream (3E) treats
 *   a dismiss without a pick as a forfeit.
 * - When the user clicks "Add reward" in the empty state, we open the
 *   RewardEditor inline. A successful add re-populates the list; no pick
 *   is forced.
 *
 * Accessibility:
 *   - Dialog handles focus trap + Escape (3J).
 *   - Option list is a `<ul role="listbox">`; each option is a
 *     `<li role="option" tabindex=0>` with Enter/Space to pick.
 *   - Every tappable row is ≥ 44pt tall (mobile requirement).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import './rewards.css';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../ui/dialog.tsx';
import { Button } from '../../ui/button.tsx';
import type { RewardId } from '../../types/ids.ts';
import type { Tier } from '../../types/wheel.ts';
import { useAppStore } from '../../state/store.ts';
import { addReward } from '../../state/slices/rewards.ts';
import { applyRewardMutation } from './reward-actions.ts';
import { newRewardId } from '../../lib/id.ts';
import { nowISO } from '../../lib/time.ts';
import { RewardEditor } from './RewardEditor.tsx';
import { RevealStage } from '../spin/RevealStage.tsx';

export interface RewardPickerModalProps {
  tier: Tier;
  open: boolean;
  onPick: (rewardId: RewardId) => void;
  onDismiss: () => void;
}

export function RewardPickerModal({
  tier,
  open,
  onPick,
  onDismiss,
}: RewardPickerModalProps): React.ReactElement {
  const rewards = useAppStore((s) => s.rewards[tier]);
  const [addOpen, setAddOpen] = useState(false);

  const visible = useMemo(() => rewards.filter((r) => !r.archived), [rewards]);
  const isEmpty = visible.length === 0;

  // Stabilize onDismiss for the Dialog's focus-trap useEffect.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);
  const handleOpenChange = useCallback((next: boolean): void => {
    if (!next) onDismissRef.current();
  }, []);

  const handlePick = (id: RewardId): void => {
    onPick(id);
  };

  const handleKey = (e: KeyboardEvent<HTMLLIElement>, id: RewardId): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePick(id);
    }
  };

  const handleAdd = (label: string): void => {
    const reward = {
      id: newRewardId(),
      tier,
      label,
      createdAt: nowISO(),
      archived: false,
    };
    applyRewardMutation((s) => addReward(s, reward));
    setAddOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="reward-picker">
          <DialogTitle>Pick your {tier} reward</DialogTitle>
          {isEmpty ? (
            <>
              <DialogDescription>
                No rewards in this tier. Add one now or skip.
              </DialogDescription>
              <div className="reward-picker__empty-actions">
                <Button variant="primary" onClick={() => setAddOpen(true)}>
                  Add reward
                </Button>
                <Button variant="ghost" onClick={onDismiss}>
                  Skip (forfeit)
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogDescription>
                Tap one to claim it. This goes into your history log.
              </DialogDescription>
              <RevealStage tier={tier} />
              <ul
                role="listbox"
                aria-label={`${tier} rewards`}
                className="reward-picker__list"
              >
                {visible.map((r) => (
                  <li
                    key={r.id}
                    role="option"
                    aria-selected="false"
                    tabIndex={0}
                    className="reward-picker__option"
                    onClick={() => handlePick(r.id)}
                    onKeyDown={(e) => handleKey(e, r.id)}
                  >
                    {r.label}
                  </li>
                ))}
              </ul>
              <div className="reward-picker__footer">
                <Button variant="ghost" onClick={onDismiss}>
                  Skip (forfeit)
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <RewardEditor
        open={addOpen}
        title={`Add ${tier} reward`}
        initialLabel=""
        onSubmit={handleAdd}
        onCancel={() => setAddOpen(false)}
      />
    </>
  );
}
