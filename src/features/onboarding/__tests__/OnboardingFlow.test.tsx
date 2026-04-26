// OnboardingFlow tests (3I) — step render, firstRun flip, A19 verbatim.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { OnboardingFlow } from '../OnboardingFlow.tsx';
import { WelcomeScreen } from '../WelcomeScreen.tsx';
import { MechanicsScreen } from '../MechanicsScreen.tsx';
import { RewardRulesScreen } from '../RewardRulesScreen.tsx';
import { InstallPromptScreen } from '../InstallPromptScreen.tsx';
import {
  __resetAppStoreForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import {
  REWARD_RULE_BODIES,
  REWARD_RULE_HEADINGS,
} from '../../rewards/reward-rules-copy.ts';

function wrap(node: React.ReactElement): React.ReactElement {
  return <MemoryRouter>{node}</MemoryRouter>;
}

describe('<OnboardingFlow />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });

  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });

  it('renders the welcome step first', () => {
    render(wrap(<OnboardingFlow />));
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
  });

  it('writes personalName on Start and advances to mechanics', async () => {
    const user = userEvent.setup();
    render(wrap(<OnboardingFlow />));

    await user.type(screen.getByLabelText(/your name/i), 'Grace');
    await user.click(screen.getByRole('button', { name: /start/i }));

    expect(screen.getByTestId('mechanics-screen')).toBeInTheDocument();
    expect(getAppStore().getState().settings.personalName).toBe('Grace');
  });

  it('leaves personalName null when name is blank', async () => {
    const user = userEvent.setup();
    render(wrap(<OnboardingFlow />));

    await user.click(screen.getByRole('button', { name: /start/i }));
    expect(getAppStore().getState().settings.personalName).toBeNull();
  });

  it('progresses through all five steps and flips firstRunCompleted on finish', async () => {
    const user = userEvent.setup();
    render(wrap(<OnboardingFlow onComplete={() => {}} />));

    // Step 1: Welcome → Start
    await user.click(screen.getByRole('button', { name: /start/i }));
    // Step 2: Mechanics → Continue
    await user.click(screen.getByRole('button', { name: /continue/i }));
    // Step 3: Reward rules → I Swear to the House
    await user.click(screen.getByRole('button', { name: /i swear to the house/i }));
    // Step 4: Milestones — fill and save.
    await user.type(screen.getByLabelText('Mini label'), 'Small treat');
    await user.type(screen.getByLabelText('Mid label'), 'Nice dinner');
    await user.type(screen.getByLabelText('Moonshot label'), 'Hawaii');
    await user.type(screen.getByLabelText('Mini target in dollars'), '10');
    await user.type(screen.getByLabelText('Mid target in dollars'), '50');
    await user.type(screen.getByLabelText('Moonshot target in dollars'), '200');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    // Step 5: Install → Finish
    expect(screen.getByTestId('install-prompt-screen')).toBeInTheDocument();
    expect(getAppStore().getState().firstRunCompleted).toBe(false);
    await user.click(screen.getByRole('button', { name: /finish/i }));

    expect(getAppStore().getState().firstRunCompleted).toBe(true);
  });
});

describe('<RewardRulesScreen /> — A19 verbatim', () => {
  afterEach(cleanup);

  it('renders all three headings and bodies exactly as exported', () => {
    render(<RewardRulesScreen onNext={() => {}} onBack={() => {}} />);
    for (const h of REWARD_RULE_HEADINGS) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument();
    }
    for (const body of REWARD_RULE_BODIES) {
      expect(screen.getByText(body)).toBeInTheDocument();
    }
  });

  it('renders the Naked Rule body verbatim', () => {
    render(<RewardRulesScreen onNext={() => {}} onBack={() => {}} />);
    expect(
      screen.getByText(
        "Never do this reward 'naked' again — only through the system. Otherwise the casino is irrelevant.",
      ),
    ).toBeInTheDocument();
  });
});

describe('<WelcomeScreen />', () => {
  beforeEach(() => {
    setPersistenceEnabled(false);
    __resetAppStoreForTests(seedInitialAppState());
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
  });
  it('renders', () => {
    render(<WelcomeScreen onNext={() => {}} />);
    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
  });
});

describe('<MechanicsScreen />', () => {
  afterEach(cleanup);
  it('renders with maybe > big and just a little bit more', () => {
    render(<MechanicsScreen onNext={() => {}} onBack={() => {}} />);
    expect(screen.getByTestId('mechanics-screen')).toBeInTheDocument();
    expect(screen.getByText(/maybe > big/i)).toBeInTheDocument();
    expect(screen.getByText(/just a little bit more/i)).toBeInTheDocument();
  });
});

describe('<InstallPromptScreen />', () => {
  afterEach(cleanup);

  it('shows iOS Share instructions when UA is iPhone', () => {
    render(
      <InstallPromptScreen
        onFinish={() => {}}
        onBack={() => {}}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
      />,
    );
    expect(screen.getByLabelText(/ios install steps/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
  });

  it('shows fallback hint on non-iOS without a captured prompt', () => {
    render(
      <InstallPromptScreen
        onFinish={() => {}}
        onBack={() => {}}
        userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/124"
      />,
    );
    expect(
      screen.getByText(/browser will show an install prompt/i),
    ).toBeInTheDocument();
  });
});
