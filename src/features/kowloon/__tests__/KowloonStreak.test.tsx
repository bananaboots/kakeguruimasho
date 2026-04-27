import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KowloonStreak } from '../KowloonStreak.tsx';

describe('KowloonStreak', () => {
  it('renders an LED-bar styled streak indicator', () => {
    const { container } = render(<KowloonStreak />);
    expect(container.querySelector('[data-testid="kowloon-streak"]')).not.toBeNull();
  });
});
