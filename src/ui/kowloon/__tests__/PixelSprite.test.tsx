import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PixelSprite } from '../PixelSprite.tsx';

describe('PixelSprite', () => {
  it('renders a 16x16 sprite as SVG rects from rows array', () => {
    const rows = [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......1.........',
    ];
    const { container } = render(
      <PixelSprite rows={rows} colors={['', '#ff0000']} scale={2} />,
    );
    const rects = container.querySelectorAll('svg rect');
    expect(rects.length).toBe(1);
  });
});
