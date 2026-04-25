/**
 * Rewards route.
 *
 * ARCHITECTURE §6 / §7F: 3F owns <Tabs T1/T2/T3> → <RewardMenu tier=.../>
 * plus a persistent <RewardRulesSidebar/> that starts collapsed.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.tsx';
import { RewardMenu } from '../features/rewards/RewardMenu.tsx';
import { RewardRulesSidebar } from '../features/rewards/reward-rules-sidebar.tsx';
import { useTheme } from '../styles/theme-context.ts';
import { DecoDivider, Motif } from '../ui/parlour/index.ts';

export default function Rewards() {
  const { themeMeta } = useTheme();
  return (
    <section
      className="route route--rewards parlour-grain parlour-halftone"
      aria-labelledby="rewards-title"
    >
      <header className="parlour-masthead">
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
      </header>

      <DecoDivider style={{ marginBottom: 'var(--space-5)' }} />

      <RewardRulesSidebar />

      <Tabs defaultValue="T1">
        <TabsList>
          <TabsTrigger value="T1">Tier 1</TabsTrigger>
          <TabsTrigger value="T2">Tier 2</TabsTrigger>
          <TabsTrigger value="T3">Tier 3</TabsTrigger>
        </TabsList>
        <TabsContent value="T1">
          <RewardMenu tier="T1" />
        </TabsContent>
        <TabsContent value="T2">
          <RewardMenu tier="T2" />
        </TabsContent>
        <TabsContent value="T3">
          <RewardMenu tier="T3" />
        </TabsContent>
      </Tabs>
    </section>
  );
}
