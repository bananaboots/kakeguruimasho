import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MosaicFloor } from '../MosaicFloor.tsx';

describe('MosaicFloor', () => {
  it('renders a div with mosaic background and provided dimensions', () => {
    const { container } = render(<MosaicFloor width={140} height={60} />);
    const div = container.querySelector('[data-testid="mosaic-floor"]');
    expect(div).not.toBeNull();
    expect((div as HTMLElement).style.width).toBe('140px');
  });
});
