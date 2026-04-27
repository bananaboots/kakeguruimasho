import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CRTBezel } from '../CRTBezel.tsx';

describe('CRTBezel', () => {
  it('renders children inside the phosphor cavity', () => {
    render(
      <CRTBezel label="CH 03">
        <div>screen content</div>
      </CRTBezel>,
    );
    expect(screen.getByText('screen content')).toBeInTheDocument();
    expect(screen.getByText('CH 03')).toBeInTheDocument();
  });

  it('shows the tally light when tally is true', () => {
    const { container } = render(
      <CRTBezel label="CH 03" tally>
        <div>x</div>
      </CRTBezel>,
    );
    expect(container.querySelector('[data-testid="crt-tally"]')).not.toBeNull();
  });

  it('hides the tally light when tally is false', () => {
    const { container } = render(
      <CRTBezel label="CH 03">
        <div>x</div>
      </CRTBezel>,
    );
    expect(container.querySelector('[data-testid="crt-tally"]')).toBeNull();
  });
});
