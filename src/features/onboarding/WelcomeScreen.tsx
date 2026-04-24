/**
 * WelcomeScreen — step 1 of the first-run flow (3I).
 *
 * Warm intro + optional name prompt. Name is written to
 * `settings.personalName` via `hydrate`. Blank keeps the default `null`.
 */

import { useState, type ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import { Input } from '../../ui/input.tsx';
import { useAppStore, getAppStore } from '../../state/store.ts';

export interface WelcomeScreenProps {
  onNext: () => void;
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps): ReactElement {
  const existing = useAppStore((s) => s.settings.personalName);
  const [name, setName] = useState(existing ?? '');

  const handleContinue = (): void => {
    const trimmed = name.trim();
    getAppStore().getState().actions.updateSettings({
      personalName: trimmed.length > 0 ? trimmed : null,
    });
    onNext();
  };

  return (
    <div className="onboarding__step" data-testid="welcome-screen">
      <p className="onboarding__eyebrow">Welcome</p>
      <h1 className="onboarding__title">Let's build your casino.</h1>
      <p className="onboarding__lead">
        You're about to hijack the most addictive machine ever built
        and point it at the habits you actually want.
      </p>
      <p className="onboarding__body">
        It takes about 90 seconds to set up. You can change everything
        later in Settings.
      </p>

      <label className="onboarding__field">
        <span className="onboarding__field-label">
          What should we call you? (optional)
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          aria-label="Your name (optional)"
          maxLength={40}
          autoComplete="given-name"
        />
      </label>

      <div className="onboarding__nav">
        <span />
        <Button variant="primary" size="lg" onClick={handleContinue}>
          Start
        </Button>
      </div>
    </div>
  );
}
