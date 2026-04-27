import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NeonSign } from '../NeonSign.tsx';

describe('NeonSign', () => {
  it('renders the Cantonese character + English label', () => {
    render(<NeonSign ch="發" en="FORTUNE" sub="HALL · 9F" />);
    expect(screen.getByText('發')).toBeInTheDocument();
    expect(screen.getByText('FORTUNE')).toBeInTheDocument();
    expect(screen.getByText('HALL · 9F')).toBeInTheDocument();
  });

  it('applies the provided color to the glow text-shadow', () => {
    const { container } = render(
      <NeonSign ch="賭" en="STAKE" color="#ff2e88" />,
    );
    const ch = container.querySelector('[data-testid="neon-sign-ch"]');
    expect(ch).not.toBeNull();
    expect((ch as HTMLElement).style.color).toBe('rgb(255, 46, 136)');
  });
});
