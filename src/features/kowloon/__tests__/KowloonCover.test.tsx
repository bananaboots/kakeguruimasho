import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KowloonCover } from '../KowloonCover.tsx';

describe('KowloonCover', () => {
  it('renders the kowloon cover panel', () => {
    const { container } = render(<KowloonCover />);
    expect(container.querySelector('[data-testid="kowloon-cover"]')).not.toBeNull();
  });

  it('shows the neon vertical sign', () => {
    const { container } = render(<KowloonCover />);
    expect(container.querySelector('[data-testid="neon-sign"]')).not.toBeNull();
  });

  it('shows mosaic floor and inspection stamps', () => {
    const { container } = render(<KowloonCover />);
    expect(container.querySelector('[data-testid="mosaic-floor"]')).not.toBeNull();
    // Multiple stamps — assert at least one
    expect(container.querySelector('[data-testid="stamp"]')).not.toBeNull();
  });
});
