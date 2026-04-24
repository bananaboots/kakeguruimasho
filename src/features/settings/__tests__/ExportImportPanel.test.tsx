// ExportImportPanel tests — export produces Blob, import round-trip.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExportImportPanel } from '../ExportImportPanel.tsx';
import {
  __resetAppStoreForTests,
  __resetPersistForTests,
  getAppStore,
  setPersistenceEnabled,
} from '../../../state/store.ts';
import { seedInitialAppState } from '../../../data/defaults.ts';
import { exportAll } from '../../../db/export.ts';
import { importAll } from '../../../db/import.ts';
import { openKakeguruiDb } from '../../../db/open.ts';
import { APP_STATE_KEY, APP_STATE_STORE } from '../../../db/schema.ts';

describe('<ExportImportPanel />', () => {
  beforeEach(async () => {
    setPersistenceEnabled(false);
    __resetPersistForTests();
    __resetAppStoreForTests(seedInitialAppState());
    // Seed IDB so exportAll() has something to read.
    const db = await openKakeguruiDb();
    await db.put(APP_STATE_STORE, seedInitialAppState(), APP_STATE_KEY);
  });
  afterEach(() => {
    cleanup();
    setPersistenceEnabled(true);
    __resetPersistForTests();
  });

  it('exportAll() produces a JSON Blob parseable by importAll', async () => {
    const blob = await exportAll();
    expect(blob).toBeInstanceOf(Blob);
    const text = await blob.text();
    const result = await importAll(text);
    expect(result.ok).toBe(true);
  });

  it('renders Export and Import buttons', () => {
    render(<ExportImportPanel />);
    expect(
      screen.getByRole('button', { name: /^export$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^import$/i }),
    ).toBeInTheDocument();
  });

  it('clicking Export triggers a download and logs export_performed', async () => {
    // Stub createObjectURL + revokeObjectURL (missing in jsdom).
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const before = getAppStore().getState().history.length;
    const user = userEvent.setup();
    render(<ExportImportPanel />);
    await user.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });
    expect(revokeSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    // Export logs a history event.
    await waitFor(() => {
      const after = getAppStore().getState().history;
      expect(after.length).toBeGreaterThan(before);
      expect(after[after.length - 1]?.kind).toBe('export_performed');
    });

    createSpy.mockRestore();
    revokeSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('import file → confirm → success reloads', async () => {
    const reload = vi.fn();
    const user = userEvent.setup();
    render(<ExportImportPanel reload={reload} />);

    // Produce a valid export to feed back in.
    const blob = await exportAll();
    const text = await blob.text();
    const file = new File([text], 'import.json', { type: 'application/json' });

    const input = screen.getByTestId('import-file-input') as HTMLInputElement;
    await user.upload(input, file);

    // Confirm dialog appears.
    expect(
      await screen.findByRole('heading', { name: /replace current state/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /replace/i }));

    await waitFor(() => {
      expect(reload).toHaveBeenCalled();
    });
  });
});
