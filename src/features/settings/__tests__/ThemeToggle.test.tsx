// ThemeToggle tests.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeToggle } from '../ThemeToggle.tsx';
import { ThemeProvider } from '../../../styles/theme-provider.tsx';

const STORAGE_KEY = 'kakegurui:theme';

describe('<ThemeToggle />', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders a radio option for every theme key', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    // Pachinko + Kowloon (ready) + 6 stubs = 8 total.
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(8);
  });

  it('marks the active theme as checked', () => {
    window.localStorage.setItem(STORAGE_KEY, 'kowloon');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const kowloon = screen.getByTestId('theme-kowloon');
    expect(kowloon).toHaveAttribute('aria-checked', 'true');
    const pachinko = screen.getByTestId('theme-pachinko');
    expect(pachinko).toHaveAttribute('aria-checked', 'false');
  });

  it('switching themes persists to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await user.click(screen.getByTestId('theme-kowloon'));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('kowloon');
  });

  it('shows a "Stub" badge on stub-status themes only', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    // Pachinko and Kowloon are status: 'ready' — no badge.
    const pachinko = screen.getByTestId('theme-pachinko');
    expect(pachinko.textContent).not.toContain('Stub');
    const kowloon = screen.getByTestId('theme-kowloon');
    expect(kowloon.textContent).not.toContain('Stub');
    // House is a stub.
    const house = screen.getByTestId('theme-house');
    expect(house.textContent).toContain('Stub');
  });
});
