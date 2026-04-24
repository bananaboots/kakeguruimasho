/**
 * MechanicsScreen — step 2: the casino in 3 paragraphs (3I).
 *
 * Pulls two load-bearing phrases from the reference PDF verbatim:
 * - "maybe > big"
 * - "just a little bit more"
 */

import type { ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';

export interface MechanicsScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export function MechanicsScreen({ onNext, onBack }: MechanicsScreenProps): ReactElement {
  return (
    <div className="onboarding__step" data-testid="mechanics-screen">
      <p className="onboarding__eyebrow">How it works</p>
      <h1 className="onboarding__title">Three pieces. That's it.</h1>

      <p className="onboarding__body">
        <strong>Do the habit.</strong> When you finish something on your
        list, you earn one paperclip: random color, drawn blind from a bag.
      </p>
      <p className="onboarding__body">
        <strong>Match colors to unlock tiers.</strong> Two of a color
        unlocks T1. Three unlocks T2. Gold is an instant T3.
      </p>
      <p className="onboarding__body">
        <strong>Spin the wheel.</strong> The reward is never guaranteed.
        That uncertainty is the whole point.
      </p>

      <blockquote className="onboarding__pullquote">
        maybe &gt; big
      </blockquote>
      <p className="onboarding__body">
        Your brain doesn't chase big rewards. It chases the <em>maybe</em>.
        The unpredictability is what keeps you coming back for
        <strong> just a little bit more</strong>.
      </p>

      <div className="onboarding__nav">
        <Button variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="lg" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
