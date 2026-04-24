// Rewards slice.

import type { AppState } from '../../types/app-state.ts';
import type { Reward } from '../../types/reward.ts';
import type { Tier } from '../../types/wheel.ts';
import type { RewardId } from '../../types/ids.ts';

export function addReward(state: AppState, reward: Reward): AppState {
  return {
    ...state,
    rewards: {
      ...state.rewards,
      [reward.tier]: [...state.rewards[reward.tier], reward],
    },
  };
}

export function updateReward(
  state: AppState,
  tier: Tier,
  rewardId: RewardId,
  patch: Partial<Omit<Reward, 'id' | 'createdAt' | 'tier'>>,
): AppState {
  return {
    ...state,
    rewards: {
      ...state.rewards,
      [tier]: state.rewards[tier].map((r) => (r.id === rewardId ? { ...r, ...patch } : r)),
    },
  };
}

export function archiveReward(state: AppState, tier: Tier, rewardId: RewardId): AppState {
  return updateReward(state, tier, rewardId, { archived: true });
}
