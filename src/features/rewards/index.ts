/**
 * Rewards feature — public surface for other agents.
 * Ownership: 3F (Wave 2). See ARCHITECTURE §7F.
 */

export { RewardMenu } from './RewardMenu.tsx';
export type { RewardMenuProps } from './RewardMenu.tsx';

export { RewardEditor } from './RewardEditor.tsx';
export type { RewardEditorProps } from './RewardEditor.tsx';

export { RewardPickerModal } from './RewardPickerModal.tsx';
export type { RewardPickerModalProps } from './RewardPickerModal.tsx';

export { RewardRulesSidebar } from './reward-rules-sidebar.tsx';
export type { RewardRulesSidebarProps } from './reward-rules-sidebar.tsx';
export { REWARD_RULE_HEADINGS, REWARD_RULE_BODIES } from './reward-rules-copy.ts';

export { openRewardPicker } from './openRewardPicker.tsx';
