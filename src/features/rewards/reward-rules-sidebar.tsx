/**
 * RewardRulesSidebar — verbatim copy of the 3 Reward Rules from the
 * SpoonFedStudy PDF (page 03, "THE 3 REWARD RULES"), per DECISIONS A19.
 *
 * NO PARAPHRASING. The headings and Naked Rule body are asserted character-
 * for-character in the test suite. If the PDF source ever changes, update
 * BOTH the copy below AND the snapshot strings in the tests — never one.
 *
 * Mounted collapsed-by-default on /rewards (see routes/Rewards.tsx).
 */

import { useState } from 'react';
import './rewards.css';
import { Button } from '../../ui/button.tsx';
import { cn } from '../../ui/utils.ts';
import { REWARD_RULE_BODIES, REWARD_RULE_HEADINGS } from './reward-rules-copy.ts';

export interface RewardRulesSidebarProps {
  /** Start expanded? Default false (spec: collapsed by default). */
  defaultExpanded?: boolean;
  /** Optional className passthrough for routing contexts. */
  className?: string;
}

export function RewardRulesSidebar({
  defaultExpanded = false,
  className,
}: RewardRulesSidebarProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <aside
      className={cn('reward-rules', className)}
      aria-label="The 3 Reward Rules"
    >
      <div className="reward-rules__header">
        <h2 className="reward-rules__title">The 3 Reward Rules</h2>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          aria-controls="reward-rules-body"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Hide' : 'Show'}
        </Button>
      </div>
      {expanded ? (
        <ol id="reward-rules-body" className="reward-rules__list">
          {REWARD_RULE_HEADINGS.map((heading, i) => (
            <li key={heading} className="reward-rules__item">
              <h3 className="reward-rules__heading">{heading}</h3>
              <p className="reward-rules__body">{REWARD_RULE_BODIES[i]}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  );
}
