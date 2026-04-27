import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ArcadeToken } from '../ArcadeToken.tsx';

describe('ArcadeToken', () => {
  it('renders an SVG with the denomination text', () => {
    const { container } = render(<ArcadeToken denom="II" color="#22e3ff" />);
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('II');
  });
});
