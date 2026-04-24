/**
 * History route — renders the full activity feed.
 *
 * The in-memory window (3A keeps 500 events) is the source here; the IDB
 * full-lifetime log is not wired into a selector yet. A date-range filter
 * is offered as a small tier of buttons.
 */

import { useState } from 'react';
import { ActivityFeed } from '../features/jar/index.ts';
import { Button } from '../ui/button.tsx';

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'All', days: Number.POSITIVE_INFINITY },
] as const;

export default function History() {
  const [days, setDays] = useState<number>(30);

  return (
    <section className="route" aria-labelledby="history-title">
      <header className="route__header">
        <h1 id="history-title" className="route__title">
          History
        </h1>
      </header>

      <div
        role="group"
        aria-label="Date range"
        style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}
      >
        {RANGES.map((r) => (
          <Button
            key={r.label}
            size="sm"
            variant={days === r.days ? 'primary' : 'secondary'}
            onClick={() => setDays(r.days)}
            aria-pressed={days === r.days}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <ActivityFeed days={days} limit={500} />
    </section>
  );
}
