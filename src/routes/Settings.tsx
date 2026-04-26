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
  ExportImportPanel,
  ResetAllDanger,
  HelpScreen,
} from '../features/settings/index.ts';
import { useAppStore } from '../state/store.ts';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Settings() {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const { themeMeta } = useTheme();
  return (
    <section
      className="route route--settings parlour-grain parlour-halftone"
      aria-labelledby="settings-title"
    >
      <header className="parlour-masthead">
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="settings-title" className="parlour-masthead__title">
          The Parlour
        </h1>
        <p className="parlour-masthead__tagline">
          Tune the house rules. Themes, bag, wheel, audio.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <div className="settings">
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
