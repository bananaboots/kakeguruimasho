/**
 * ErrorBoundary — top-level fallback (3J).
 *
 * Catches any runtime render error below App and shows a friendly dark-mode
 * page with the option to reload. We deliberately DO NOT wire this to any
 * crash-reporting service in v1 (privacy + no backend per SPEC §7).
 *
 * In dev, the error message is shown verbatim to help feature agents debug.
 * In production, we show a short summary.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/button.tsx';

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional override for the fallback UI (e.g. for route-level boundaries later). */
  fallback?: (ctx: { error: Error; reset: () => void }) => ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] render error', error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>🛠</div>
          <h1 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Something broke</h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              marginTop: 'var(--space-2)',
            }}
          >
            The app hit an unexpected error. Your saved data is safe — it lives on your
            device. Try reloading.
          </p>
          {import.meta.env.DEV ? (
            <pre
              style={{
                textAlign: 'left',
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                overflow: 'auto',
              }}
            >
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          ) : null}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-5)' }}>
            <Button variant="secondary" onClick={this.reset}>
              Try again
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload app
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
