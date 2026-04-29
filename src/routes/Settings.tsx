/**
 * Settings route — sectioned cards for mobile.
 * 3I owns all panels; layout is a vertically-scrolling stack.
 */

import {
  WheelConfigEditor,
  BagCompositionEditor,
  HygieneCutoffEditor,
  SfxHapticsToggles,
  SpinStyleToggle,
  ThemeToggle,
  ExportImportPanel,
  ResetAllDanger,
  HelpScreen,
} from '../features/settings/index.ts';
import { useAppStore } from '../state/store.ts';
import { RouteHeader } from '../ui/parlour/index.ts';

export default function Settings() {
  const activeJarId = useAppStore((s) => s.activeJarId);
  return (
    <section
      className="route route--settings parlour-grain parlour-halftone"
      aria-labelledby="settings-title"
    >
      <RouteHeader title="Settings" titleId="settings-title" />

      <div className="settings">
        <ThemeToggle />
        <SpinStyleToggle />
        <WheelConfigEditor jarId={activeJarId} />
        <BagCompositionEditor />
        <HygieneCutoffEditor />
        <SfxHapticsToggles />
        <ExportImportPanel />
        <HelpScreen />
        <ResetAllDanger />
      </div>
    </section>
  );
}
