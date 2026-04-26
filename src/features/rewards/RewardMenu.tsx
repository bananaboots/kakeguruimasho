/**
 * RewardMenu — list + CRUD for one tier.
 *
 * Ownership: 3F (Wave 2). Consumes `rewardsSlice` reducers (Wave 1 3A) by
 * reading state via `useAppStore` and writing back through the store's
 * internal `setState`. No new actions are added to the store; all mutations
 * use the existing `addReward` / `updateReward` / `archiveReward` reducers.
 *
 * See ARCHITECTURE §7F + WAVE2_3F_NOTES.md for the exposed contracts.
 */

import { useMemo, useState } from 'react';
import './rewards.css';
import { Button } from '../../ui/button.tsx';
import type { Reward } from '../../types/reward.ts';
import type { RewardId } from '../../types/ids.ts';
import type { Tier } from '../../types/wheel.ts';
import { useAppStore } from '../../state/store.ts';
import { addReward, updateReward, archiveReward } from '../../state/slices/rewards.ts';
import { applyRewardMutation } from './reward-actions.ts';
import { newRewardId } from '../../lib/id.ts';
import { nowISO } from '../../lib/time.ts';
import { RewardEditor } from './RewardEditor.tsx';

export interface RewardMenuProps {
  tier: Tier;
  /** When true, include archived rewards (greyed out). Default false. */
  showArchived?: boolean;
}

type EditorState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; reward: Reward };

export function RewardMenu({
  tier,
  showArchived = false,
}: RewardMenuProps): React.ReactElement {
  const rewards = useAppStore((s) => s.rewards[tier]);
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });

  const visible = useMemo(
    () => (showArchived ? rewards : rewards.filter((r) => !r.archived)),
    [rewards, showArchived],
  );

  const openAdd = (): void => setEditor({ mode: 'add' });
  const openEdit = (reward: Reward): void => setEditor({ mode: 'edit', reward });
  const closeEditor = (): void => setEditor({ mode: 'closed' });

  const submit = (label: string): void => {
    const trimmed = label.trim();
    if (trimmed.length === 0) {
      // Defensive — the editor already guards this, but never write an empty
      // label into state.
      return;
    }
    if (editor.mode === 'add') {
      const newReward: Reward = {
        id: newRewardId(),
        tier,
        label: trimmed,
        createdAt: nowISO(),
        archived: false,
      };
      applyRewardMutation((s) => addReward(s, newReward));
    } else if (editor.mode === 'edit') {
      applyRewardMutation((s) => updateReward(s, tier, editor.reward.id, { label: trimmed }));
    }
    closeEditor();
  };

  const onArchive = (rewardId: RewardId): void => {
    applyRewardMutation((s) => archiveReward(s, tier, rewardId));
  };

  const onUnarchive = (rewardId: RewardId): void => {
    applyRewardMutation((s) => updateReward(s, tier, rewardId, { archived: false }));
  };

  const tierLabel = tier === 'T1' ? 'I' : tier === 'T2' ? 'II' : 'III';

  return (
    <div className="reward-menu" data-tier={tier}>
      {visible.length === 0 ? (
        <p className="reward-menu__empty">
          No rewards yet. Add one to populate the {tier} menu.
        </p>
      ) : (
        <ul className="reward-menu__list" role="list">
          {visible.map((r) => (
            <li
              key={r.id}
              className="reward-menu__item"
              data-archived={r.archived ? 'true' : 'false'}
            >
              <span className="reward-menu__label">{r.label}</span>
              <span className="reward-menu__actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(r)}
                  aria-label={`Edit ${r.label}`}
                >
                  Edit
                </Button>
                {r.archived ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUnarchive(r.id)}
                    aria-label={`Unarchive ${r.label}`}
                  >
                    Unarchive
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onArchive(r.id)}
                    aria-label={`Archive ${r.label}`}
                  >
                    Archive
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="reward-menu__toolbar">
        <Button variant="ghost" size="md" onClick={openAdd}>
          + Add to Tier {tierLabel}
        </Button>
      </div>

      <RewardEditor
        // Remount between modes so internal `useState(initialLabel)` is fresh.
        key={editor.mode === 'edit' ? `edit-${editor.reward.id}` : `add-${editor.mode}`}
        open={editor.mode !== 'closed'}
        initialLabel={editor.mode === 'edit' ? editor.reward.label : ''}
        title={editor.mode === 'edit' ? `Edit ${tier} reward` : `Add ${tier} reward`}
        onSubmit={submit}
        onCancel={closeEditor}
      />
    </div>
  );
}
