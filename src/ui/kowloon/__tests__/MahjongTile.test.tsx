import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MahjongTile } from '../MahjongTile.tsx';

describe('MahjongTile', () => {
  it('renders the kanji character + sub label', () => {
    render(<MahjongTile ch="東" sub="East" />);
    expect(screen.getByText('東')).toBeInTheDocument();
    expect(screen.getByText('East')).toBeInTheDocument();
  });
});
