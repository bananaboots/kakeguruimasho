import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stamp } from '../Stamp.tsx';

describe('Stamp', () => {
  it('renders the kanji + English label', () => {
    render(<Stamp ch="檢" en="INSPECTED" color="#ff2e88" />);
    expect(screen.getByText('檢')).toBeInTheDocument();
    expect(screen.getByText('INSPECTED')).toBeInTheDocument();
  });
});
