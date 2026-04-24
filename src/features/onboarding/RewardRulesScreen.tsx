/**
 * RewardRulesScreen — step 3: A19 verbatim rules.
 *
 * Imports the headings + bodies from the 3F-owned constants file so the
 * verbatim-copy test in /features/rewards/__tests__ and the one colocated
 * here both assert against the same source of truth.
 *
 * User must tap "I commit" to proceed (§11 — make the Naked Rule a
 * conscious choice, not a scroll-past).
 */

import type { ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import {
  REWARD_RULE_BODIES,
  REWARD_RULE_HEADINGS,
} from '../rewards/reward-rules-copy.ts';

export interface RewardRulesScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export function RewardRulesScreen({
  onNext,
  onBack,
}: RewardRulesScreenProps): ReactElement {
  return (
    <div className="onboarding__step" data-testid="reward-rules-screen">
      <p className="onboarding__eyebrow">Rules of engagement</p>
      <h1 className="onboarding__title">The 3 Reward Rules</h1>
      <p className="onboarding__body">
        Your rewards have to follow these three rules. Otherwise the
        system collapses on day three.
      </p>

      <ol className="onboarding__rules" aria-label="The 3 Reward Rules">
        {REWARD_RULE_HEADINGS.map((heading, i) => (
          <li key={heading} className="onboarding__rule">
            <h2 className="onboarding__rule-heading">{heading}</h2>
            <p className="onboarding__rule-body">{REWARD_RULE_BODIES[i]}</p>
          </li>
        ))}
      </ol>

      <div className="onboarding__nav">
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="lg" onClick={onNext}>
          I commit
        </Button>
      </div>
    </div>
  );
}
