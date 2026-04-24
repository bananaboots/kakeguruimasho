/**
 * Settings route — sectioned cards for mobile.
 * 3I owns all panels; layout is a vertically-scrolling stack.
 */

import {
  WheelConfigEditor,
  BagCompositionEditor,
  HygieneCutoffEditor,
  SfxHapticsToggles,
  ExportImportPanel,
  ResetAllDanger,
  HelpScreen,
} from '../features/settings/index.ts';
import { useAppStore } from '../state/store.ts';

export default function Settings() {
  const activeJarId = useAppStore((s) => s.activeJarId);
  return (
    <section className="route" aria-labelledby="settings-title">
      <header className="route__header">
        <h1 id="settings-title" className="route__title">
          Settings
        </h1>
      </header>
      <div className="settings">
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
