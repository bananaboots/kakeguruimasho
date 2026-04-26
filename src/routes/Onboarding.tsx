/**
 * Onboarding route — mounts 3I's OnboardingFlow inside the cinematic shell
 * (no-op at <1024px; salon-entrance backdrop + framed card at >=1024px).
 */

import { OnboardingFlow } from '../features/onboarding/index.ts';
import { CinematicShell } from '../ui/parlour/index.ts';

export default function Onboarding() {
  return (
    <CinematicShell>
      <OnboardingFlow />
    </CinematicShell>
  );
}
