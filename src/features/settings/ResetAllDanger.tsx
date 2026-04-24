/**
 * ResetAllDanger — triple-confirm wipe (3I).
 *
 * Flow (non-negotiable):
 *   1. Tap "Reset all data" →
 *   2. Dialog #1: "Are you sure?" (Cancel / Continue) →
 *   3. Dialog #2: "Really sure? All data will be lost." (Cancel / Continue) →
 *   4. Dialog #3: type RESET to confirm → Reset.
 *
 * Final action:
 *   - close IDB (via `__resetPersistForTests`? no — we want live singleton)
 *   - `indexedDB.deleteDatabase('kakeguruimasho')`
 *   - `window.location.reload()` (fresh boot seeds initial state)
 */

import { useState, type ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog.tsx';
import { Input } from '../../ui/input.tsx';

type Stage = 'idle' | 'confirm1' | 'confirm2' | 'confirm3';

export const RESET_PHRASE = 'RESET';
export const DB_NAME = 'kakeguruimasho';

export interface ResetAllDangerProps {
  /** Injected in tests: called instead of `window.location.reload()`. */
  reload?: () => void;
  /** Injected in tests: called instead of `indexedDB.deleteDatabase(...)`. */
  deleteDatabase?: (name: string) => void;
}

export function ResetAllDanger({
  reload,
  deleteDatabase,
}: ResetAllDangerProps = {}): ReactElement {
  const [stage, setStage] = useState<Stage>('idle');
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = (): void => {
    setStage('idle');
    setPhrase('');
    setError(null);
  };

  const doReset = (): void => {
    if (phrase !== RESET_PHRASE) {
      setError(`Type ${RESET_PHRASE} exactly to confirm.`);
      return;
    }
    try {
      if (deleteDatabase) deleteDatabase(DB_NAME);
      else if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase(DB_NAME);
    } catch {
      // Best-effort — if delete fails the reload will still re-boot.
    }
    if (reload) reload();
    else window.location.reload();
  };

  return (
    <section
      className="settings__card settings__card--danger"
      aria-labelledby="reset-all-title"
      data-testid="reset-all-danger"
    >
      <header>
        <h2 id="reset-all-title" className="settings__title">
          Reset all data
        </h2>
        <p className="settings__hint">
          Wipes everything: jar, milestones, streaks, history,
          rewards, habits. There is no undo.
        </p>
      </header>

      <div className="settings__actions">
        <Button variant="danger" onClick={() => setStage('confirm1')}>
          Reset all data
        </Button>
      </div>

      <Dialog open={stage === 'confirm1'} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This will permanently delete your entire casino.
          </DialogDescription>
          <div className="settings__actions">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setStage('confirm2')}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stage === 'confirm2'} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogTitle>Really sure?</DialogTitle>
          <DialogDescription>
            All data will be lost. There is no recovery.
          </DialogDescription>
          <div className="settings__actions">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setStage('confirm3')}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stage === 'confirm3'} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogTitle>Type to confirm</DialogTitle>
          <DialogDescription>
            Type <span className="settings__reset-code">{RESET_PHRASE}</span>{' '}
            to confirm.
          </DialogDescription>
          <label className="settings__field-label">
            <span>Confirmation phrase</span>
            <Input
              value={phrase}
              onChange={(e) => {
                setPhrase(e.target.value);
                setError(null);
              }}
              aria-label="Reset confirmation phrase"
              autoCapitalize="characters"
              spellCheck={false}
              data-testid="reset-confirm-input"
            />
          </label>
          {error ? (
            <p className="settings__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="settings__actions">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={doReset}
              disabled={phrase !== RESET_PHRASE}
              data-testid="reset-confirm-button"
            >
              Reset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
