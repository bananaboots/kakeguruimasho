/**
 * Jar route — mounts <JarVisual>, <MilestoneEditor>, <StreakDisplay>, and
 * the activity feed preview. The MilestoneClaimModal is mounted INSIDE
 * <JarVisual> (it opens in response to clicks on unclaimed-unlock buttons).
 *
 * Flow:
 *  - If the jar has unconfigured milestones (target === 0), the editor is
 *    expanded in "first-run" mode. Otherwise a collapsed "Edit milestones"
 *    button toggles it.
 *  - After a Moonshot reset, JarVisual dispatches a `jar:reset-complete`
 *    CustomEvent on the document; we listen and open the editor.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  JarVisual,
  MilestoneEditor,
  ActivityFeed,
  StreakDisplay,
} from '../features/jar/index.ts';
import { Button } from '../ui/button.tsx';
import { useAppStore } from '../state/store.ts';
import { DEFAULT_MILESTONE_IDS } from '../types/ids.ts';
import { RouteHeader } from '../ui/parlour/index.ts';

export default function Jar() {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const milestones = useAppStore((s) => s.jars[activeJarId]?.milestones);

  const firstRun = useMemo(() => {
    if (!milestones) return false;
    // First-run means any of the three canonical milestones is unconfigured
    // (target still zero). Extra checkpoints added later don't count.
    return DEFAULT_MILESTONE_IDS.some(
      (id) => (milestones[id]?.target ?? 0) === 0,
    );
  }, [milestones]);

  const [editorOpen, setEditorOpen] = useState<boolean>(firstRun);

  // If firstRun transitions to true (e.g. just reset), pop the editor open.
  // "Adjust state during render" pattern via a previous-value marker avoids a
  // setState inside useEffect (react-hooks/set-state-in-effect).
  const [prevFirstRun, setPrevFirstRun] = useState<boolean>(firstRun);
  if (prevFirstRun !== firstRun) {
    setPrevFirstRun(firstRun);
    if (firstRun) setEditorOpen(true);
  }

  // Listen for the reset-complete signal the claim modal fires.
  useEffect(() => {
    const handler = (): void => setEditorOpen(true);
    document.addEventListener('jar:reset-complete', handler);
    return (): void => document.removeEventListener('jar:reset-complete', handler);
  }, []);

  return (
    <section
      className="route route--jar parlour-grain parlour-halftone"
      aria-labelledby="jar-title"
    >
      <RouteHeader title="Pot" titleId="jar-title" />

      <div className="jar-layout">
        <div className="jar-layout__visual">
          <StreakDisplay jarId={activeJarId} />
          <JarVisual jarId={activeJarId} />
        </div>

        <div className="jar-layout__side">
          {editorOpen ? (
            firstRun ? (
              <MilestoneEditor
                jarId={activeJarId}
                forceFirstRun
                onSave={() => setEditorOpen(false)}
              />
            ) : (
              <MilestoneEditor
                jarId={activeJarId}
                onSave={() => setEditorOpen(false)}
                onCancel={() => setEditorOpen(false)}
              />
            )
          ) : (
            <Button
              variant="secondary"
              onClick={() => setEditorOpen(true)}
              data-testid="jar-edit-milestones"
            >
              Edit milestones
            </Button>
          )}

          <ActivityFeed jarId={activeJarId} days={7} />
        </div>
      </div>
    </section>
  );
}
