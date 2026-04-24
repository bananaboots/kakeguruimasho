// Dialog focus-trap regression (Phase 4).
//
// Prior to Phase 4, the shared <DialogContent> re-ran its focus-pulling
// effect on every parent render because the effect depended on the
// memoized `onOpenChange` + `handleKey` callbacks. When a controlled
// <Input> inside the dialog fired onChange → parent setState → re-render,
// the dialog re-focused itself and subsequent keystrokes were lost.
//
// This test renders a Dialog with a controlled input, types a multi-char
// string, and asserts every character landed. Without the fix the input's
// value would lose characters after focus snapped to the content div.

import { describe, it, expect, afterEach } from 'vitest';
import { useState, type ReactElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Dialog, DialogContent, DialogTitle } from '../dialog.tsx';
import { Input } from '../input.tsx';

function Harness(): ReactElement {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Test</DialogTitle>
        <Input
          aria-label="test-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="dialog-input"
        />
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog focus-trap regression', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not steal keystrokes from a controlled <Input> inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByTestId('dialog-input') as HTMLInputElement;
    // Click the input so focus lands there; then type multi-char.
    await user.click(input);
    await user.type(input, 'Hawaii');

    expect(input.value).toBe('Hawaii');
  });
});
