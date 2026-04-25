import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RevealStage } from '../RevealStage.tsx';

describe('<RevealStage />', () => {
  afterEach(cleanup);

  it('renders the spinning chrysanthemum + 大当たり banner for T3', () => {
    render(<RevealStage tier="T3" />);
    expect(screen.getByTestId('reveal-stage')).toBeInTheDocument();
    expect(screen.getByText('大当たり')).toBeInTheDocument();
    expect(screen.getByText(/TIER III/)).toBeInTheDocument();
    const bloom = screen.getByTestId('reveal-stage__bloom');
    expect(bloom.className).toMatch(/reveal-stage__bloom/);
  });

  it('renders nothing for T1/T2', () => {
    const { container } = render(<RevealStage tier="T1" />);
    expect(container.firstChild).toBeNull();
  });
});
