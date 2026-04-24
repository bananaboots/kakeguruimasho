/**
 * OnboardingFlow — 5-step first-run gate (3I).
 *
 * Steps: Welcome → Mechanics → Reward Rules → Milestones → Install Prompt.
 * On Finish: flips `appState.firstRunCompleted = true` via `hydrate`,
 * then navigates to `/`. The app-level redirect guard in `src/App.tsx`
 * sends first-run users here; on completion it steps out of the way.
 */

import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import './onboarding.css';
import { WelcomeScreen } from './WelcomeScreen.tsx';
import { MechanicsScreen } from './MechanicsScreen.tsx';
import { RewardRulesScreen } from './RewardRulesScreen.tsx';
import { MilestonesScreen } from './MilestonesScreen.tsx';
import { InstallPromptScreen } from './InstallPromptScreen.tsx';
import { getAppStore } from '../../state/store.ts';

const STEP_COUNT = 5;

export interface OnboardingFlowProps {
  /** Called once firstRunCompleted has flipped true. Defaults to navigate('/'). */
  onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps = {}): ReactElement {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const next = (): void => setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  const back = (): void => setStep((s) => Math.max(s - 1, 0));

  const finish = (): void => {
    const state = getAppStore().getState();
    if (!state.firstRunCompleted) {
      state.actions.setFirstRunCompleted();
    }
    if (onComplete) onComplete();
    else navigate('/', { replace: true });
  };

  return (
    <section
      className="onboarding"
      aria-labelledby="onboarding-title"
      data-testid="onboarding-flow"
      data-step={step}
    >
      <h1 id="onboarding-title" className="sr-only">
        Onboarding
      </h1>
      <div
        className="onboarding__progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEP_COUNT}
        aria-valuenow={step + 1}
        aria-valuetext={`Step ${step + 1} of ${STEP_COUNT}`}
      >
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className="onboarding__dot"
            data-active={i <= step}
            aria-hidden="true"
          />
        ))}
      </div>

      {step === 0 ? (
        <WelcomeScreen onNext={next} />
      ) : step === 1 ? (
        <MechanicsScreen onNext={next} onBack={back} />
      ) : step === 2 ? (
        <RewardRulesScreen onNext={next} onBack={back} />
      ) : step === 3 ? (
        <MilestonesScreen onNext={next} onBack={back} />
      ) : (
        <InstallPromptScreen onFinish={finish} onBack={back} />
      )}
    </section>
  );
}
