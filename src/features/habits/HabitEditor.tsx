/**
 * HabitEditor — add/edit/archive-delete modal for any HabitUnit kind (3D).
 *
 * Uses 3J's <Dialog>. Supports all HabitUnit variants:
 *  - count   → {target, unit label}
 *  - minutes → {target}
 *  - sets    → {target}
 *  - bundle  → {subItems[], cutoffLocal}
 *
 * Persistence: applies the pure `habitsSlice` reducer then triggers an
 * `appendHistory` so the persist layer flushes (see store.ts
 * `commitWithHistory`). We do NOT add a new action to 3A's surface —
 * instead this file requests that 3A expose `addHabit / updateHabit /
 * archiveHabit` actions in WAVE2_3D_NOTES.md; until then, setState +
 * appendHistory is the agreed temporary path.
 */

import { useCallback, useState } from 'react';
import { Button } from '../../ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../ui/dialog.tsx';
import { Input } from '../../ui/input.tsx';
import { getAppStore } from '../../state/store.ts';
import type { Habit, HabitUnit } from '../../types/habit.ts';
import { newHabitId } from '../../lib/id.ts';
import { nowISO } from '../../lib/time.ts';
import { DEFAULT_HABIT_IDS } from '../../data/defaults.ts';

type UnitKind = HabitUnit['kind'];

export interface HabitEditorProps {
  /** null ⇒ create mode. */
  habit: Habit | null;
  open: boolean;
  onClose: () => void;
}

function defaultUnitFor(kind: UnitKind): HabitUnit {
  switch (kind) {
    case 'count':
      return { kind: 'count', target: 2500, unit: 'steps' };
    case 'minutes':
      return { kind: 'minutes', target: 20 };
    case 'sets':
      return { kind: 'sets', target: 4 };
    case 'bundle':
      return {
        kind: 'bundle',
        subItems: ['shower', 'brush teeth', 'wash face', 'in bed by cutoff'],
        cutoffLocal: '01:00',
      };
  }
}

export function HabitEditor({ habit, open, onClose }: HabitEditorProps) {
  const isEdit = habit !== null;

  const [name, setName] = useState(habit?.name ?? '');
  const [unit, setUnit] = useState<HabitUnit>(habit?.unit ?? defaultUnitFor('count'));

  // Reset local state when the dialog opens for a different habit.
  // React pattern: "adjust state while rendering" using a previous-key marker,
  // avoiding a setState inside useEffect (react-hooks/set-state-in-effect).
  // See https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [lastHabitId, setLastHabitId] = useState<string | null>(habit?.id ?? null);
  const [lastOpen, setLastOpen] = useState<boolean>(open);
  if (open && (habit?.id ?? null) !== lastHabitId) {
    setLastHabitId(habit?.id ?? null);
    setLastOpen(open);
    setName(habit?.name ?? '');
    setUnit(habit?.unit ?? defaultUnitFor('count'));
  } else if (open && !lastOpen) {
    setLastOpen(true);
    setName(habit?.name ?? '');
    setUnit(habit?.unit ?? defaultUnitFor('count'));
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  const canSave = name.trim().length > 0 && isUnitValid(unit);

  const handleSave = useCallback(() => {
    if (!canSave) return;
    const { actions } = getAppStore().getState();
    if (isEdit) {
      actions.updateHabit(habit.id, { name: name.trim(), unit });
    } else {
      const newHabit: Habit = {
        id: newHabitId(),
        name: name.trim(),
        unit,
        createdAt: nowISO(),
        archived: false,
      };
      actions.addHabit(newHabit);
    }
    onClose();
  }, [canSave, habit, isEdit, name, unit, onClose]);

  const handleArchive = useCallback(() => {
    if (!habit) return;
    // Archived acts as "deleted" for user-visible purposes (brief says
    // delete, but soft-archive preserves history references).
    getAppStore().getState().actions.archiveHabit(habit.id);
    onClose();
  }, [habit, onClose]);

  // Special guard: don't allow archiving the default Hygiene bundle — the
  // retroactive-award flow relies on its presence. User can edit though.
  const isHygieneDefault = habit?.id === DEFAULT_HABIT_IDS.hygiene;

  return (
    <Dialog open={open} onOpenChange={(n) => (!n ? onClose() : undefined)}>
      <DialogContent>
        <DialogTitle>{isEdit ? `Edit ${habit?.name}` : 'New habit'}</DialogTitle>
        <DialogDescription>
          A habit earns one clip per completed unit. Pick a unit type the
          friction feels right for.
        </DialogDescription>

        <div className="habit-editor__field">
          <label htmlFor="habit-editor-name" className="habit-editor__label">
            Name
          </label>
          <Input
            id="habit-editor-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stretching"
            autoFocus
          />
        </div>

        <div className="habit-editor__field">
          <span className="habit-editor__label" id="habit-editor-unit-label">
            Unit type
          </span>
          <div
            className="habit-editor__kind-group"
            role="radiogroup"
            aria-labelledby="habit-editor-unit-label"
          >
            {(['count', 'minutes', 'sets', 'bundle'] as UnitKind[]).map((k) => (
              <Button
                key={k}
                variant={unit.kind === k ? 'primary' : 'secondary'}
                size="sm"
                role="radio"
                aria-checked={unit.kind === k}
                onClick={() => setUnit(defaultUnitFor(k))}
              >
                {k}
              </Button>
            ))}
          </div>
        </div>

        <UnitEditor unit={unit} onChange={setUnit} />

        <div className="habit-editor__actions">
          {isEdit && !isHygieneDefault ? (
            <Button variant="danger" onClick={handleArchive}>
              Archive
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isUnitValid(unit: HabitUnit): boolean {
  switch (unit.kind) {
    case 'count':
      return unit.target > 0 && unit.unit.trim().length > 0;
    case 'minutes':
    case 'sets':
      return unit.target > 0;
    case 'bundle':
      return (
        unit.subItems.length >= 2 &&
        unit.subItems.every((s) => s.trim().length > 0) &&
        /^\d{1,2}:\d{2}$/.test(unit.cutoffLocal)
      );
  }
}

function UnitEditor({
  unit,
  onChange,
}: {
  unit: HabitUnit;
  onChange: (u: HabitUnit) => void;
}) {
  if (unit.kind === 'count') {
    return (
      <div className="habit-editor__unit-fields">
        <label className="habit-editor__label" htmlFor="habit-editor-count-target">
          Steps / units per clip
        </label>
        <Input
          id="habit-editor-count-target"
          type="number"
          inputMode="numeric"
          min={1}
          value={unit.target}
          onChange={(e) =>
            onChange({ ...unit, target: Math.max(1, Number(e.target.value) || 0) })
          }
        />
        <label className="habit-editor__label" htmlFor="habit-editor-count-unit">
          Unit label
        </label>
        <Input
          id="habit-editor-count-unit"
          value={unit.unit}
          onChange={(e) => onChange({ ...unit, unit: e.target.value })}
          placeholder="steps"
        />
      </div>
    );
  }

  if (unit.kind === 'minutes' || unit.kind === 'sets') {
    const suffix = unit.kind === 'minutes' ? 'minutes' : 'sets';
    return (
      <div className="habit-editor__unit-fields">
        <label className="habit-editor__label" htmlFor="habit-editor-target">
          {suffix === 'minutes' ? 'Minutes per clip' : 'Sets per clip'}
        </label>
        <Input
          id="habit-editor-target"
          type="number"
          inputMode="numeric"
          min={1}
          value={unit.target}
          onChange={(e) =>
            onChange({ ...unit, target: Math.max(1, Number(e.target.value) || 0) })
          }
        />
      </div>
    );
  }

  // bundle
  const subItems = unit.subItems;
  return (
    <div className="habit-editor__unit-fields">
      <label className="habit-editor__label" htmlFor="habit-editor-cutoff">
        Cutoff (HH:MM local)
      </label>
      <Input
        id="habit-editor-cutoff"
        value={unit.cutoffLocal}
        onChange={(e) => onChange({ ...unit, cutoffLocal: e.target.value })}
        placeholder="01:00"
      />
      <span className="habit-editor__label">Sub-items</span>
      <ul className="habit-editor__subitems">
        {subItems.map((s, i) => (
          <li key={i} className="habit-editor__subitem-row">
            <Input
              value={s}
              aria-label={`Sub-item ${i + 1}`}
              onChange={(e) => {
                const next = [...subItems];
                next[i] = e.target.value;
                onChange({ ...unit, subItems: next });
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Remove sub-item ${i + 1}`}
              onClick={() =>
                onChange({
                  ...unit,
                  subItems: subItems.filter((_, j) => j !== i),
                })
              }
              disabled={subItems.length <= 2}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange({ ...unit, subItems: [...subItems, ''] })}
      >
        + Sub-item
      </Button>
    </div>
  );
}
