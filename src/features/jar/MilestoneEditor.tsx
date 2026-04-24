/**
 * MilestoneEditor — edit the Mini / Mid / Moonshot labels + $ targets.
 *
 * Invoked on first-run onboarding AND after a Moonshot reset. Validates
 * that targets are strictly increasing: mini < mid < moonshot.
 *
 * Like the rewards editor, milestones aren't on the typed `Actions` surface
 * of the store — we update via a pure reducer and route through `hydrate`
 * so persistence schedules correctly.
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
import type { Milestone } from '../../types/jar.ts';
import type { AppState } from '../../types/app-state.ts';

const MILESTONE_IDS: MilestoneId[] = ['mini', 'mid', 'moonshot'];

type Draft = Record<
  MilestoneId,
  {
    label: string;
    /** Stringly-typed for input control; parsed on submit. */
    target: string;
  }
>;

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

  const initial = useMemo<Draft>(() => {
    const m = milestones;
    return {
      mini: {
        label: m?.mini.label ?? '',
        target: m?.mini.target ? String(m.mini.target) : '',
      },
      mid: {
        label: m?.mid.label ?? '',
        target: m?.mid.target ? String(m.mid.target) : '',
      },
      moonshot: {
        label: m?.moonshot.label ?? '',
        target: m?.moonshot.target ? String(m.moonshot.target) : '',
      },
    };
  }, [milestones]);

  const [draft, setDraft] = useState<Draft>(initial);

  // Re-sync the draft if the underlying milestones change while the editor
  // is mounted (e.g. a resetJar reopens the editor with blanks). Uses the
  // "adjust state during render" pattern to avoid setState inside useEffect
  // (react-hooks/set-state-in-effect).
  const [lastInitial, setLastInitial] = useState<Draft>(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setDraft(initial);
  }

  const [error, setError] = useState<string | null>(null);

  const updateField = (
    id: MilestoneId,
    key: 'label' | 'target',
    value: string,
  ): void => {
    setDraft((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));
  };

  const parseTargets = (): { mini: number; mid: number; moonshot: number } | null => {
    const parsed: Partial<Record<MilestoneId, number>> = {};
    for (const id of MILESTONE_IDS) {
      const n = Number(draft[id].target);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
      parsed[id] = n;
    }
    return parsed as { mini: number; mid: number; moonshot: number };
  };

  const validate = useCallback((): string | null => {
    for (const id of MILESTONE_IDS) {
      if (!draft[id].label.trim()) return `${pretty(id)} needs a label.`;
    }
    const targets = parseTargets();
    if (!targets) return 'Targets must be positive whole dollar amounts.';
    if (!(targets.mini < targets.mid && targets.mid < targets.moonshot)) {
      return 'Targets must increase: mini < mid < moonshot.';
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
    const targets = parseTargets()!;
    const store = getAppStore();
    const state = store.getState();
    const { actions: _actions, ...rest } = state;
    void _actions;
    const prev = rest as AppState;
    const jar = prev.jars[jarId];
    if (!jar) return;

    const nextMilestones: Record<MilestoneId, Milestone> = {
      mini: {
        id: 'mini',
        label: draft.mini.label.trim(),
        target: targets.mini,
      },
      mid: {
        id: 'mid',
        label: draft.mid.label.trim(),
        target: targets.mid,
      },
      moonshot: {
        id: 'moonshot',
        label: draft.moonshot.label.trim(),
        target: targets.moonshot,
      },
    };

    const next: AppState = {
      ...prev,
      jars: {
        ...prev.jars,
        [jarId]: { ...jar, milestones: nextMilestones },
      },
    };
    state.actions.hydrate(next);
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

      {MILESTONE_IDS.map((id) => (
        <fieldset key={id} className="milestone-editor__row">
          <legend className="milestone-editor__legend">{pretty(id)}</legend>
          <div className="milestone-editor__row-fields">
            <label>
              <span className="sr-only">{pretty(id)} label</span>
              <Input
                placeholder={`${pretty(id)} label`}
                aria-label={`${pretty(id)} label`}
                value={draft[id].label}
                onChange={(e) => updateField(id, 'label', e.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label>
              <span className="sr-only">{pretty(id)} target in dollars</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="$"
                aria-label={`${pretty(id)} target in dollars`}
                value={draft[id].target}
                onChange={(e) => updateField(id, 'target', e.target.value)}
                required
              />
            </label>
          </div>
        </fieldset>
      ))}

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

function pretty(id: MilestoneId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
