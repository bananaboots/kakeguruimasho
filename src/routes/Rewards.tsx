/**
 * Vault route — Rituals (input) + Rewards (output) on one screen.
 *
 * Rituals on top, Rewards beneath; both groups are stacked vertically
 * with section titles. Each reward tier still gets a badge + title +
 * trailing gold rule, mirroring the original "Menu · Treat Yourself"
 * design source.
 */

import { HabitList } from '../features/habits/index.ts';
import { RewardMenu } from '../features/rewards/RewardMenu.tsx';
import { RewardRulesSidebar } from '../features/rewards/reward-rules-sidebar.tsx';
import { SectionTitle } from '../ui/parlour/index.ts';
import type { Tier } from '../types/wheel.ts';
import { cn } from '../ui/utils.ts';

const TIERS: { tier: Tier; n: string; title: string }[] = [
  { tier: 'T1', n: 'I', title: 'Small Pleasures' },
  { tier: 'T2', n: 'II', title: 'Medium Treats' },
  { tier: 'T3', n: 'III', title: 'The Big Game' },
];

export default function Rewards() {
  return (
    <section
      className="route route--rewards parlour-grain parlour-halftone"
      aria-labelledby="rewards-title"
    >
      <h1 id="rewards-title" className="sr-only">
        The Vault
      </h1>

      <SectionTitle jp="行" en="Rituals" />
      <HabitList compact showIcon={false} />

      <SectionTitle
        jp="褒"
        en="Rewards"
        style={{ marginTop: 'var(--space-4)' }}
      />
      <RewardRulesSidebar />

      <div className="reward-tiers">
        {TIERS.map((t) => (
          <section
            key={t.tier}
            className="reward-tier"
            aria-label={`Tier ${t.n} · ${t.title}`}
          >
            <header className="reward-tier__header">
              <div
                className={cn(
                  'reward-tier__badge',
                  t.tier === 'T3' && 'reward-tier__badge--gold',
                )}
                aria-hidden
              >
                {t.n}
              </div>
              <h2 className="reward-tier__title">{t.title}</h2>
              <div className="reward-tier__rule" aria-hidden />
            </header>
            <RewardMenu tier={t.tier} />
          </section>
        ))}
      </div>
    </section>
  );
}
