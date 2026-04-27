import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WireBundle } from '../WireBundle.tsx';

describe('WireBundle', () => {
  it('renders an SVG with multiple stroke paths', () => {
    const { container } = render(<WireBundle width={280} />);
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThanOrEqual(4);
  });
});
