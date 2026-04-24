/**
 * MilestoneEditor — edit the Mini / Mid / Moonshot labels + $ targets,
 * plus any number of user-added intermediate milestones.
 *
 * Contract:
 *  - The three default milestones (mini/mid/moonshot) always exist and
 *    can be edited but not removed.
 *  - Extra milestones have generated ids, show a remove button, and
 *    behave as pure checkpoints (claim stamps history but doesn't
 *    reset the jar — only moonshot does that).
 *  - Validation: Mini < Mid < Moonshot is still enforced on the three
 *    defaults. Extra milestone targets just need to be positive
 *    integers; they can fall anywhere in the range.
 */

import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react';
import { Button } from '../../ui/button.tsx';
import { Input } from '../../ui/input.tsx';
import { useAppStore, getAppStore } from '../../state/store.ts';
import type { JarId, MilestoneId } from '../../types/ids.ts';
import {
  DEFAULT_MILESTONE_IDS,
  MID_MILESTONE_ID,
  MINI_MILESTONE_ID,
  MOONSHOT_MILESTONE_ID,
  isDefaultMilestone,
} from '../../types/ids.ts';
import { newMilestoneId } from '../../lib/id.ts';

type DraftRow = {
  id: MilestoneId;
  label: string;
  /** Stringly-typed for input control; parsed on submit. */
  target: string;
  /** False for the three canonical milestones, true for user-added ones. */
  removable: boolean;
  /** True for an un-saved row that was just added in this editor session. */
  fresh?: boolean;
};

export interface MilestoneEditorProps {
  jarId: JarId;
  /** Called on successful save. */
  onSave?: () => void;
  /** Called if the user cancels (ignored on first-run where there's no back-out). */
  onCancel?: () => void;
  /** If true, hide the Cancel button (first-run or post-reset flows). */
  forceFirstRun?: boolean;
}

export function MilestoneEditor({
  jarId,
  onSave,
  onCancel,
  forceFirstRun = false,
}: MilestoneEditorProps): ReactElement {
  const milestones = useAppStore((s) => s.jars[jarId]?.milestones);

  const initial = useMemo<DraftRow[]>(() => {
    if (!milestones) {
      return DEFAULT_MILESTONE_IDS.map((id) => ({
        id,
        label: '',
        target: '',
        removable: false,
      }));
    }
    const rows: DraftRow[] = [];
    // Keep the three defaults in canonical order at the top.
    for (const id of DEFAULT_MILESTONE_IDS) {
      const m = milestones[id];
      rows.push({
        id,
        label: m?.label ?? '',
        target: m?.target ? String(m.target) : '',
        removable: false,
      });
    }
    // Append user-added checkpoints, ordered by target ascending.
    const extras = (Object.keys(milestones) as MilestoneId[])
      .filter((id) => !isDefaultMilestone(id))
      .map((id) => milestones[id]!)
      .sort((a, b) => a.target - b.target);
    for (const m of extras) {
      rows.push({
        id: m.id,
        label: m.label,
        target: m.target ? String(m.target) : '',
        removable: true,
      });
    }
    return rows;
  }, [milestones]);

  const [draft, setDraft] = useState<DraftRow[]>(initial);

  // Re-sync the draft if the underlying milestones change while the editor
  // is mounted (e.g. a resetJar reopens the editor with blanks). Uses the
  // "adjust state during render" pattern to avoid setState inside useEffect.
  const [lastInitial, setLastInitial] = useState<DraftRow[]>(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setDraft(initial);
  }

  const [error, setError] = useState<string | null>(null);

  const patchRow = (id: MilestoneId, patch: Partial<DraftRow>): void => {
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: MilestoneId): void => {
    setDraft((rows) => rows.filter((r) => r.id !== id));
  };

  const addExtraRow = (): void => {
    const id = newMilestoneId();
    setDraft((rows) => [
      ...rows,
      { id, label: '', target: '', removable: true, fresh: true },
    ]);
  };

  const parseTarget = (s: string): number | null => {
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
    return n;
  };

  const validate = useCallback((): string | null => {
    for (const row of draft) {
      if (!row.label.trim()) {
        return row.removable
          ? 'Every milestone needs a label.'
          : `${prettyDefault(row.id)} needs a label.`;
      }
      if (parseTarget(row.target) === null) {
        return 'Targets must be positive whole dollar amounts.';
      }
    }
    // Default-three ordering check: Mini < Mid < Moonshot.
    const t = (id: MilestoneId): number =>
      parseTarget(draft.find((r) => r.id === id)!.target) ?? 0;
    const mini = t(MINI_MILESTONE_ID);
    const mid = t(MID_MILESTONE_ID);
    const moon = t(MOONSHOT_MILESTONE_ID);
    if (!(mini < mid && mid < moon)) {
      return 'Targets must increase: Mini < Mid < Moonshot.';
    }
    return null;
  }, [draft]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const store = getAppStore();
    const { actions } = store.getState();

    const prev = store.getState().jars[jarId]?.milestones ?? {};
    const prevIds = new Set(Object.keys(prev) as MilestoneId[]);
    const draftIds = new Set(draft.map((r) => r.id));

    // 1. Remove rows the user deleted this session.
    for (const id of prevIds) {
      if (!isDefaultMilestone(id) && !draftIds.has(id)) {
        actions.removeMilestone(jarId, id);
      }
    }

    // 2. Add fresh rows the user just appended.
    //    We use addMilestone() so the store generates the audit event.
    //    The `fresh` flag distinguishes these from user-added rows that
    //    already existed on prior save.
    for (const row of draft) {
      if (row.fresh && !prevIds.has(row.id)) {
        actions.addMilestone(jarId, {
          label: row.label.trim(),
          target: parseTarget(row.target)!,
        });
      }
    }

    // 3. Patch all still-present rows (defaults + non-fresh extras).
    const patch: Record<MilestoneId, { label: string; target: number }> =
      {} as Record<MilestoneId, { label: string; target: number }>;
    for (const row of draft) {
      if (row.fresh) continue; // already written by addMilestone
      patch[row.id] = {
        label: row.label.trim(),
        target: parseTarget(row.target)!,
      };
    }
    if (Object.keys(patch).length > 0) {
      actions.updateMilestones(jarId, patch);
    }

    setError(null);
    onSave?.();
  };

  return (
    <form
      className="milestone-editor"
      onSubmit={handleSubmit}
      aria-labelledby={`milestone-editor-title-${jarId}`}
      data-testid="milestone-editor"
    >
      <h2 id={`milestone-editor-title-${jarId}`} className="milestone-editor__legend">
        Milestones
      </h2>

      {draft.map((row) => {
        const legend = row.removable ? 'Extra milestone' : prettyDefault(row.id);
        return (
          <fieldset key={row.id} className="milestone-editor__row">
            <legend className="milestone-editor__legend">{legend}</legend>
            <div className="milestone-editor__row-fields">
              <label>
                <span className="sr-only">{legend} label</span>
                <Input
                  placeholder={row.removable ? 'What you get' : `${legend} label`}
                  aria-label={`${legend} label`}
                  value={row.label}
                  onChange={(e) => patchRow(row.id, { label: e.target.value })}
                  maxLength={80}
                  required
                />
              </label>
              <label>
                <span className="sr-only">{legend} target in dollars</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  placeholder="$"
                  aria-label={`${legend} target in dollars`}
                  value={row.target}
                  onChange={(e) => patchRow(row.id, { target: e.target.value })}
                  required
                />
              </label>
              {row.removable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${legend}`}
                  onClick={() => removeRow(row.id)}
                  data-testid={`milestone-remove-${row.id}`}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </fieldset>
        );
      })}

      <div className="milestone-editor__add">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addExtraRow}
          data-testid="milestone-add"
        >
          + Add milestone
        </Button>
      </div>

      {error ? (
        <p className="milestone-editor__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="milestone-editor__actions">
        {!forceFirstRun && onCancel ? (
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button variant="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}

function prettyDefault(id: MilestoneId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
