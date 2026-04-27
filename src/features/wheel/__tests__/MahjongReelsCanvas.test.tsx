import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MahjongReelsCanvas } from '../MahjongReelsCanvas.tsx';

describe('MahjongReelsCanvas', () => {
  it('renders three vertical reels with mahjong tile faces', () => {
    const { container } = render(
      <MahjongReelsCanvas outcome="T1" spinning={false} size={300} />,
    );
    const reels = container.querySelectorAll('[data-testid="mahjong-reel"]');
    expect(reels.length).toBe(3);
  });

  it('renders inside a CRT bezel', () => {
    const { container } = render(
      <MahjongReelsCanvas outcome="T1" spinning={false} size={300} />,
    );
    expect(container.querySelector('[data-testid="crt-bezel"]')).not.toBeNull();
  });

  it('renders the JACKPOT tile faces when outcome is JACKPOT', () => {
    const { container } = render(
      <MahjongReelsCanvas outcome="JACKPOT" spinning={false} size={300} />,
    );
    // JACKPOT face triplet in TILE_FACES is ['★', '大', '獎']
    expect(container.textContent).toContain('★');
    expect(container.textContent).toContain('大');
    expect(container.textContent).toContain('獎');
  });
});
