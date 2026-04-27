/**
 * RewardEditor — minimal add/edit modal for a single reward's `label`.
 *
 * Wraps 3J's <Dialog> + <Input> + <Button>. Submits the raw string;
 * parent owns mapping to `addReward` / `updateReward`.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import './rewards.css';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '../../ui/Drawer.tsx';
import { Button } from '../../ui/button.tsx';
import { Input } from '../../ui/input.tsx';

export interface RewardEditorProps {
  open: boolean;
  title: string;
  initialLabel: string;
  onSubmit: (label: string) => void;
  onCancel: () => void;
}

/**
 * Callers should pass a `key` that changes between add/edit invocations so
 * this component remounts and `useState(initialLabel)` re-initializes.
 * Intentionally no label-sync useEffect — it risks clobbering keystrokes
 * when parents re-render with the same `initialLabel` reference.
 */
export function RewardEditor({
  open,
  title,
  initialLabel,
  onSubmit,
  onCancel,
}: RewardEditorProps): React.ReactElement {
  const [label, setLabel] = useState(initialLabel);

  // Keep the latest onCancel in a ref so handleOpenChange can have stable
  // identity — the underlying <Dialog> has a focus-trap useEffect keyed to
  // onOpenChange; if that identity changed per keystroke, focus would be
  // yanked back to the dialog content and typing would be lost.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = label.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  };

  const handleOpenChange = useCallback((next: boolean): void => {
    if (!next) onCancelRef.current();
  }, []);

  const valid = label.trim().length > 0;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="reward-editor" aria-label={title}>
        <DrawerTitle>{title}</DrawerTitle>
        <DrawerDescription>
          A single line label. Judgment is on you — the 3 reward rules are a sidebar, not a validator.
        </DrawerDescription>
        <form onSubmit={handleSubmit} className="reward-editor__form">
          <label className="reward-editor__field">
            <span className="reward-editor__label-text">Reward label</span>
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 15 min YouTube rabbit hole"
              maxLength={120}
              required
              aria-required="true"
            />
          </label>
          <div className="reward-editor__actions">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!valid}>
              Save
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
