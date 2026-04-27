import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Motif } from '../Motif.tsx';

describe('Motif', () => {
  it('renders the mahjong glyph when symbol is mahjong', () => {
    const { container } = render(<Motif symbol="mahjong" size={60} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // Mahjong has tile body + center 中 rect (2 rects) and hatch lines + crossbars (4 lines).
    expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('line').length).toBeGreaterThanOrEqual(4);
  });

  it('falls back to fleur for an unknown symbol', () => {
    // @ts-expect-error — testing runtime fallback for an invalid symbol
    const { container } = render(<Motif symbol="unknown-symbol" size={60} />);
    expect(container.querySelector('svg')).not.toBeNull();
    // Fleur has 4 petal-arc <path> elements — assert structurally so a future
    // refactor that changes the default branch is caught.
    expect(container.querySelectorAll('path').length).toBeGreaterThanOrEqual(4);
  });
});
