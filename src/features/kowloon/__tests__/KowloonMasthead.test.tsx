import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KowloonMasthead } from '../KowloonMasthead.tsx';

describe('KowloonMasthead', () => {
  it('renders children inside a parlour-masthead--neon header', () => {
    render(
      <KowloonMasthead>
        <h1>Test Title</h1>
      </KowloonMasthead>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    const header = screen.getByTestId('kowloon-masthead');
    expect(header).toHaveClass('parlour-masthead--neon');
  });
});
