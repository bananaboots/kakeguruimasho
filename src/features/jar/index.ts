/**
 * Jar & Streak feature barrel (3G).
 *
 * Re-exports the components that `Home.tsx`, `Jar.tsx`, and `History.tsx`
 * mount into their labeled slots.
 */

import './jar.css';

export { JarVisual } from './JarVisual.tsx';
export type { JarVisualProps } from './JarVisual.tsx';

export { MilestoneEditor } from './MilestoneEditor.tsx';
export type { MilestoneEditorProps } from './MilestoneEditor.tsx';

export { MilestoneClaimModal } from './MilestoneClaimModal.tsx';
export type { MilestoneClaimModalProps } from './MilestoneClaimModal.tsx';

export { ActivityFeed } from './ActivityFeed.tsx';
export type { ActivityFeedProps } from './ActivityFeed.tsx';

export { StreakDisplay } from './StreakDisplay.tsx';
export type { StreakDisplayProps } from './StreakDisplay.tsx';

export { PachinkoStreak } from './PachinkoStreak.tsx';
export type { PachinkoStreakProps } from './PachinkoStreak.tsx';

export { PachinkoPotMini } from './PachinkoPotMini.tsx';
export type { PachinkoPotMiniProps } from './PachinkoPotMini.tsx';
