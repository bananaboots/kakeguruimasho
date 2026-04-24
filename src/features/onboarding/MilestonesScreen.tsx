/**
 * MilestonesScreen — step 4: user fills mini/mid/moonshot (3I).
 *
 * Reuses 3G's `<MilestoneEditor>` with `forceFirstRun` so the Cancel
 * button is hidden. On save we advance; we ALSO keep a Back button in
 * the outer nav for visited-via-Back cases — but MilestoneEditor owns
 * its own Save button, so Back here lives in a secondary row.
 */

import type { ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import { MilestoneEditor } from '../jar/MilestoneEditor.tsx';
import { useAppStore } from '../../state/store.ts';

export interface MilestonesScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export function MilestonesScreen({
  onNext,
  onBack,
}: MilestonesScreenProps): ReactElement {
  const activeJarId = useAppStore((s) => s.activeJarId);

  return (
    <div className="onboarding__step" data-testid="milestones-screen">
      <p className="onboarding__eyebrow">Your jar</p>
      <h1 className="onboarding__title">Pick three dreams.</h1>
      <p className="onboarding__body">
        Every clip you earn = $1 into the jar. Name three things you'd
        love, with a dollar target for each. They must go from smallest
        to biggest: Mini &lt; Mid &lt; Moonshot.
      </p>

      <MilestoneEditor
        jarId={activeJarId}
        forceFirstRun
        onSave={onNext}
      />

      <div className="onboarding__nav">
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
        <span />
      </div>
    </div>
  );
}
