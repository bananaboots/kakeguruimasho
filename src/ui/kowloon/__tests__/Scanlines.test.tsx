import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Scanlines } from '../Scanlines.tsx';

describe('Scanlines', () => {
  it('renders a non-interactive overlay div', () => {
    const { container } = render(<Scanlines />);
    const overlay = container.querySelector('[data-testid="scanlines-overlay"]');
    expect(overlay).not.toBeNull();
    const styles = (overlay as HTMLElement).style;
    expect(styles.pointerEvents).toBe('none');
  });
});
