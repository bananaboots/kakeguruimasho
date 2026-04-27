import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CinematicShell } from '../CinematicShell.tsx';

afterEach(() => vi.restoreAllMocks());

function mockMatch(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(min-width: 1024px)',
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => true,
  } as unknown as MediaQueryList);
}

describe('CinematicShell', () => {
  it('renders children unchanged at narrow viewport', () => {
    mockMatch(false);
    render(
      <CinematicShell>
        <p>onboarding step</p>
      </CinematicShell>,
    );
    expect(screen.getByText('onboarding step')).toBeInTheDocument();
    expect(screen.queryByTestId('cinematic-backdrop')).not.toBeInTheDocument();
  });

  it('wraps children in backdrop chrome at wide viewport', () => {
    mockMatch(true);
    render(
      <CinematicShell>
        <p>onboarding step</p>
      </CinematicShell>,
    );
    expect(screen.getByText('onboarding step')).toBeInTheDocument();
    expect(screen.getByTestId('cinematic-backdrop')).toBeInTheDocument();
  });
});
