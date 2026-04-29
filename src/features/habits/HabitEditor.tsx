/**
 * HabitEditor — add/edit/archive-delete modal for habits.
 *
 * Unit kinds offered in the picker:
 *  - count  → {target, unit label} (covers steps, minutes, sets, reps, …)
 *  - bundle → {subItems[], cutoffLocal}
 *  - binary → no fields; tap once = 1 clip
 *
 * Legacy `minutes` and `sets` kinds are migrated to `count` at boot
 * (see main.tsx :: patchLegacyUnitKinds), so they never reach this UI.
 */

import { useCallback, useState, type FormEvent } from 'react';
import { Button } from '../../ui/button.tsx';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '../../ui/Drawer.tsx';
import { Input } from '../../ui/input.tsx';
import { getAppStore } from '../../state/store.ts';
import type { Habit, HabitUnit } from '../../types/habit.ts';
import { newHabitId } from '../../lib/id.ts';
import { nowISO } from '../../lib/time.ts';
import { DEFAULT_HABIT_IDS } from '../../data/defaults.ts';
import { RitualIcon } from './icon-bank.tsx';
import { ICON_KEYS, isIconKey } from './icon-keys.ts';

type UnitKind = 'count' | 'bundle' | 'binary';

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
    case 'bundle':
      return {
        kind: 'bundle',
        subItems: ['', '', ''],
        cutoffLocal: '23:59',
      };
    case 'binary':
      return { kind: 'binary' };
  }
}

function uiKindFor(unit: HabitUnit): UnitKind {
  // Legacy minutes / sets render the count editor (boot migration converts).
  switch (unit.kind) {
    case 'minutes':
    case 'sets':
    case 'count':
      return 'count';
    case 'bundle':
      return 'bundle';
    case 'binary':
      return 'binary';
  }
}

export function HabitEditor({ habit, open, onClose }: HabitEditorProps) {
  const isEdit = habit !== null;

  const [name, setName] = useState(habit?.name ?? '');
  const [unit, setUnit] = useState<HabitUnit>(habit?.unit ?? defaultUnitFor('binary'));
  const [iconKey, setIconKey] = useState<string | undefined>(habit?.iconKey);

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
    setUnit(habit?.unit ?? defaultUnitFor('binary'));
    setIconKey(habit?.iconKey);
  } else if (open && !lastOpen) {
    setLastOpen(true);
    setName(habit?.name ?? '');
    setUnit(habit?.unit ?? defaultUnitFor('binary'));
    setIconKey(habit?.iconKey);
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  const canSave = name.trim().length > 0 && isUnitValid(unit);

  const handleSave = useCallback(() => {
    if (!canSave) return;
    const { actions } = getAppStore().getState();
    const patch: Partial<Habit> = {
      name: name.trim(),
      unit,
      ...(isIconKey(iconKey) ? { iconKey } : {}),
    };
    if (isEdit) {
      actions.updateHabit(habit.id, patch);
    } else {
      const newHabit: Habit = {
        id: newHabitId(),
        name: name.trim(),
        unit,
        createdAt: nowISO(),
        archived: false,
        ...(isIconKey(iconKey) ? { iconKey } : {}),
      };
      actions.addHabit(newHabit);
    }
    onClose();
  }, [canSave, habit, isEdit, name, unit, iconKey, onClose]);

  const handleSubmit = useCallback(
    (e: FormEvent): void => {
      e.preventDefault();
      handleSave();
    },
    [handleSave],
  );

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
    <Drawer open={open} onOpenChange={(n) => (!n ? onClose() : undefined)}>
      <DrawerContent>
        <DrawerTitle>{isEdit ? `Edit ${habit?.name}` : 'New habit'}</DrawerTitle>
        <DrawerDescription>
          A habit earns one clip per completed unit. Pick a unit type the
          friction feels right for.
        </DrawerDescription>

        <form onSubmit={handleSubmit}>
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
            Unit type <span className="habit-editor__hint">(optional — leave on Yes/No for binary habits)</span>
          </span>
          <div
            className="habit-editor__kind-group"
            role="radiogroup"
            aria-labelledby="habit-editor-unit-label"
          >
            {(['binary', 'count', 'bundle'] as UnitKind[]).map((k) => (
              <Button
                key={k}
                variant={uiKindFor(unit) === k ? 'primary' : 'secondary'}
                size="sm"
                role="radio"
                aria-checked={uiKindFor(unit) === k}
                onClick={() => setUnit(defaultUnitFor(k))}
              >
                {k === 'binary' ? 'Yes / No' : k === 'count' ? 'Count' : 'Bundle'}
              </Button>
            ))}
          </div>
        </div>

        <UnitEditor unit={unit} onChange={setUnit} />

        <div className="habit-editor__field">
          <span className="habit-editor__label" id="habit-editor-icon-label">
            Icon <span className="habit-editor__hint">(optional)</span>
          </span>
          <div
            className="habit-editor__icon-grid"
            role="radiogroup"
            aria-labelledby="habit-editor-icon-label"
          >
            <button
              type="button"
              className="habit-editor__icon-option habit-editor__icon-option--clear"
              role="radio"
              aria-checked={!iconKey}
              aria-label="No icon"
              data-selected={!iconKey}
              onClick={() => setIconKey(undefined)}
            >
              —
            </button>
            {ICON_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className="habit-editor__icon-option"
                role="radio"
                aria-checked={iconKey === k}
                aria-label={k}
                data-selected={iconKey === k}
                onClick={() => setIconKey(k)}
              >
                <RitualIcon
                  iconKey={k}
                  size={20}
                  color={iconKey === k ? 'var(--color-gold)' : 'var(--color-ink-muted)'}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="habit-editor__actions">
          {isEdit && !isHygieneDefault ? (
            <Button variant="danger" type="button" onClick={handleArchive}>
              Archive
            </Button>
          ) : null}
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!canSave}>
            Save
          </Button>
        </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function isUnitValid(unit: HabitUnit): boolean {
  switch (unit.kind) {
    case 'count':
      return unit.target > 0 && unit.unit.trim().length > 0;
    case 'minutes':
    case 'sets':
      // Legacy kinds — the boot migration converts these, but if a stale
      // editor session sees one, it's still valid (positive target).
      return unit.target > 0;
    case 'bundle':
      return (
        unit.subItems.length >= 2 &&
        unit.subItems.every((s) => s.trim().length > 0) &&
        /^\d{1,2}:\d{2}$/.test(unit.cutoffLocal)
      );
    case 'binary':
      return true;
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

  if (unit.kind === 'binary') {
    return null;
  }

  if (unit.kind === 'minutes' || unit.kind === 'sets') {
    // Legacy in-memory only; the boot migration converts these. Render
    // nothing so they don't surface a removed editor branch.
    return null;
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
