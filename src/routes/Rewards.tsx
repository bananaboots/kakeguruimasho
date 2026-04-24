/**
 * Rewards route.
 *
 * ARCHITECTURE §6 / §7F: 3F owns <Tabs T1/T2/T3> → <RewardMenu tier=.../>
 * plus a persistent <RewardRulesSidebar/> that starts collapsed.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.tsx';
import { RewardMenu } from '../features/rewards/RewardMenu.tsx';
import { RewardRulesSidebar } from '../features/rewards/reward-rules-sidebar.tsx';

export default function Rewards() {
  return (
    <section className="route" aria-labelledby="rewards-title">
      <header className="route__header">
        <h1 id="rewards-title" className="route__title">
          Rewards
        </h1>
      </header>

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
