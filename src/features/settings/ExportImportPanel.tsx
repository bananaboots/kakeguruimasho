/**
 * ExportImportPanel — JSON round-trip via 3A's db/{export,import} (3I).
 *
 * Export: trigger `exportAll()`; download the returned Blob with an
 *   auto-named file (<date>-kakeguruimasho.json). Also logs via
 *   `actions.logExportPerformed(jarId)`.
 *
 * Import: file picker → read text → `importAll(json)` → on success,
 *   reload so Zustand picks up the fresh IDB blob. On failure, show the
 *   first validation error.
 *
 * A confirm dialog warns that import replaces current state.
 */

import { useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { Button } from '../../ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog.tsx';
import { exportAll } from '../../db/export.ts';
import { importAll } from '../../db/import.ts';
import { useAppStore, getAppStore } from '../../state/store.ts';

type Phase = 'idle' | 'confirm' | 'importing' | 'done' | 'error';

export interface ExportImportPanelProps {
  /** Injected in tests to avoid real reload. */
  reload?: () => void;
}

export function ExportImportPanel({
  reload,
}: ExportImportPanelProps = {}): ReactElement {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingJson, setPendingJson] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async (): Promise<void> => {
    try {
      const blob = await exportAll();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${stamp}-kakeguruimasho.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      getAppStore().getState().actions.logExportPerformed(activeJarId);
      setMessage('Export downloaded.');
    } catch (e) {
      setMessage(
        `Export failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  const openFilePicker = (): void => {
    fileRef.current?.click();
  };

  const handleFileSelected = async (
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setPendingJson(text);
    setPhase('confirm');
  };

  const handleConfirmImport = async (): Promise<void> => {
    if (!pendingJson) return;
    setPhase('importing');
    const result = await importAll(pendingJson);
    if (result.ok) {
      getAppStore().getState().actions.logImportPerformed(activeJarId, null);
      setPhase('done');
      setMessage('Import succeeded. Reloading…');
      if (reload) reload();
      else window.location.reload();
    } else {
      const first = result.errors[0];
      setMessage(
        `Import failed: ${first?.message ?? 'validation error'}${
          first?.path && first.path.length > 0 ? ` (${first.path.join('.')})` : ''
        }`,
      );
      setPhase('error');
    }
  };

  const handleCancelImport = (): void => {
    setPendingJson(null);
    setPhase('idle');
  };

  return (
    <section
      className="settings__card"
      aria-labelledby="export-import-title"
      data-testid="export-import-panel"
    >
      <header>
        <h2 id="export-import-title" className="settings__title">
          Backup &amp; restore
        </h2>
        <p className="settings__hint">
          Export your full state as JSON. Import replaces everything;
          snapshots from the last 30 days are preserved.
        </p>
      </header>

      <div className="settings__actions">
        <Button variant="secondary" onClick={handleExport}>
          Export
        </Button>
        <Button variant="secondary" onClick={openFilePicker}>
          Import
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        data-testid="import-file-input"
      />

      {message ? (
        <p
          className="settings__hint"
          role={phase === 'error' ? 'alert' : 'status'}
        >
          {message}
        </p>
      ) : null}

      <Dialog
        open={phase === 'confirm'}
        onOpenChange={(v) => {
          if (!v) handleCancelImport();
        }}
      >
        <DialogContent>
          <DialogTitle>Replace current state?</DialogTitle>
          <DialogDescription>
            Import will overwrite everything currently in the app. A
            snapshot of your current state is preserved in the
            background, so you can restore if needed.
          </DialogDescription>
          <div className="settings__actions">
            <Button variant="ghost" onClick={handleCancelImport}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmImport}>
              Replace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
