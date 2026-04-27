/**
 * Rewards route — "The Vault".
 *
 * All three tiers are visible at once, stacked. Each tier gets a badge +
 * title + trailing gold rule, mirroring the design source's
 * "Menu · Treat Yourself" screen.
 *
 * Source: `/tmp/design1/kakeguruimasho/project/screens-misc.jsx:147`.
 */

import { RewardMenu } from '../features/rewards/RewardMenu.tsx';
import { RewardRulesSidebar } from '../features/rewards/reward-rules-sidebar.tsx';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Masthead, Motif } from '../ui/parlour/index.ts';
import type { Tier } from '../types/wheel.ts';
import { cn } from '../ui/utils.ts';

const TIERS: { tier: Tier; n: string; title: string }[] = [
  { tier: 'T1', n: 'I', title: 'Small Pleasures' },
  { tier: 'T2', n: 'II', title: 'Medium Treats' },
  { tier: 'T3', n: 'III', title: 'The Big Game' },
];

export default function Rewards() {
  const { themeMeta } = useTheme();
  return (
    <section
      className="route route--rewards parlour-grain parlour-halftone"
      aria-labelledby="rewards-title"
    >
      <Masthead>
        <div className="parlour-masthead__kicker">{themeMeta.tagline}</div>
        <h1 id="rewards-title" className="parlour-masthead__title">
          The Vault
        </h1>
        <p className="parlour-masthead__tagline">
          What the house owes you when the wheel lands true.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 'var(--space-3) auto 0',
          }}
        >
          <Motif size={36} />
        </div>
      </Masthead>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

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
