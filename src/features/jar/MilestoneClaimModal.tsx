/**
 * MilestoneClaimModal — celebration + confirm flow for claim actions.
 *
 * D1 behavior:
 *  - Mini/Mid:  single "Claim" tap  →  actions.claimMilestone(jarId, id).
 *    Jar `total` is NOT touched. The claim just stamps `claimed[id]`.
 *  - Moonshot:  step 1 "Claim"      →  actions.claimMilestone(jarId, 'moonshot'),
 *               step 2 "Reset jar"  →  actions.resetJar(jarId),
 *    then `onMoonshotReset` fires so the route can open <MilestoneEditor>.
 *
 * The dialog uses 3J's <Dialog> which handles focus-trap, Escape, and portal.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog.tsx';
import { Button } from '../../ui/button.tsx';
import { useAppStore, getAppStore } from '../../state/store.ts';
import type { JarId, MilestoneId } from '../../types/ids.ts';

export interface MilestoneClaimModalProps {
  jarId: JarId;
  milestone: MilestoneId;
  open: boolean;
  onClose: () => void;
  /** Fires after moonshot claim + reset confirm; route opens editor. */
  onMoonshotReset?: () => void;
}

type MoonshotStep = 'celebrate' | 'confirm-reset';

export function MilestoneClaimModal({
  jarId,
  milestone,
  open,
  onClose,
  onMoonshotReset,
}: MilestoneClaimModalProps): ReactElement {
  const milestoneData = useAppStore((s) => s.jars[jarId]?.milestones[milestone]);
  const [moonshotStep, setMoonshotStep] = useState<MoonshotStep>('celebrate');

  // Reset internal step when the modal closes so re-open starts fresh.
  // "Adjust state during render" pattern: track `open` via a previous-value
  // marker to avoid setState inside useEffect (react-hooks/set-state-in-effect).
  const [wasOpen, setWasOpen] = useState<boolean>(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setMoonshotStep('celebrate');
  }

  // Stabilize onClose for the Dialog's focus-trap.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const handleOpenChange = useCallback((next: boolean): void => {
    if (!next) onCloseRef.current();
  }, []);

  const label = milestoneData?.label?.trim() || prettyMilestoneId(milestone);

  const isMoonshot = milestone === 'moonshot';

  const handleClaimNonMoonshot = useCallback(() => {
    const { actions } = getAppStore().getState();
    actions.claimMilestone(jarId, milestone);
    onClose();
  }, [jarId, milestone, onClose]);

  const handleMoonshotClaim = useCallback(() => {
    // D1 step 1: stamp claimed.moonshot.
    const { actions } = getAppStore().getState();
    actions.claimMilestone(jarId, 'moonshot');
    setMoonshotStep('confirm-reset');
  }, [jarId]);

  const handleMoonshotReset = useCallback(() => {
    // D1 step 2: reset jar + invoke parent callback so it can route
    // to the milestone editor.
    const { actions } = getAppStore().getState();
    actions.resetJar(jarId);
    onMoonshotReset?.();
    onClose();
  }, [jarId, onMoonshotReset, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="milestone-claim" data-testid="milestone-claim-modal">
        {isMoonshot && moonshotStep === 'celebrate' ? (
          <>
            <DialogTitle className="milestone-claim__headline">
              Moonshot!
            </DialogTitle>
            <DialogDescription>
              The jar is full. Claim the reward, then we&rsquo;ll reset the jar
              and set the next milestones.
            </DialogDescription>
            {label ? <p className="milestone-claim__label">{label}</p> : null}
            <div className="milestone-claim__actions">
              <Button variant="ghost" onClick={onClose}>
                Not yet
              </Button>
              <Button
                variant="gold"
                onClick={handleMoonshotClaim}
                data-testid="milestone-claim-claim"
              >
                Claim
              </Button>
            </div>
          </>
        ) : isMoonshot && moonshotStep === 'confirm-reset' ? (
          <>
            <DialogTitle className="milestone-claim__headline">
              Reset jar & set new milestones?
            </DialogTitle>
            <DialogDescription>
              This zeroes the jar total and clears all claims so you can start
              the next cycle.
            </DialogDescription>
            <div className="milestone-claim__actions">
              <Button variant="ghost" onClick={onClose}>
                Later
              </Button>
              <Button
                variant="danger"
                onClick={handleMoonshotReset}
                data-testid="milestone-claim-reset"
              >
                Reset jar
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle className="milestone-claim__headline">
              {prettyMilestoneId(milestone)} unlocked — {label}
            </DialogTitle>
            <DialogDescription>
              Enjoy it. Claiming logs history but does not empty the jar.
            </DialogDescription>
            <div className="milestone-claim__actions">
              <Button variant="ghost" onClick={onClose}>
                Later
              </Button>
              <Button
                variant="primary"
                onClick={handleClaimNonMoonshot}
                data-testid="milestone-claim-claim"
              >
                Claim
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function prettyMilestoneId(id: MilestoneId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
