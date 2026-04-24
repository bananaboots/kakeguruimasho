/**
 * RewardsLinkCard — surfaces the tier-grouped reward editor from Settings.
 *
 * The `/rewards` route has full T1/T2/T3 CRUD, but until now it was only
 * reachable from the post-spin RewardPickerModal. Settings gets a card
 * that deep-links over so users can build up the menus proactively and
 * offload the "what do I want?" decision before a spin lands.
 */

import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../state/store.ts';
import { Button } from '../../ui/button.tsx';

export function RewardsLinkCard(): ReactElement {
  const navigate = useNavigate();
  const rewards = useAppStore((s) => s.rewards);
  const counts = {
    T1: rewards.T1.filter((r) => !r.archived).length,
    T2: rewards.T2.filter((r) => !r.archived).length,
    T3: rewards.T3.filter((r) => !r.archived).length,
  };
  const thin = counts.T1 < 3 || counts.T2 < 3 || counts.T3 < 3;

  return (
    <section
      className="settings__card"
      aria-labelledby="rewards-link-title"
      data-testid="rewards-link-card"
    >
      <header>
        <h2 id="rewards-link-title" className="settings__title">
          Reward menus
        </h2>
        <p className="settings__hint">
          Pre-pick what T1 / T2 / T3 wins look like so you don&rsquo;t
          have to think after a spin. Tap the tier tabs on the next
          screen to add, rename, or archive rewards.
        </p>
      </header>

      <ul className="settings__help-list" aria-label="Active reward counts">
        <li>
          <strong>T1</strong> · {counts.T1} active
        </li>
        <li>
          <strong>T2</strong> · {counts.T2} active
        </li>
        <li>
          <strong>T3</strong> · {counts.T3} active
        </li>
      </ul>

      {thin ? (
        <p className="settings__hint" role="note">
          At least a few options per tier keeps the picker interesting.
        </p>
      ) : null}

      <Button
        variant="primary"
        onClick={() => navigate('/rewards')}
        data-testid="rewards-link-card-open"
      >
        Edit reward menus
      </Button>
    </section>
  );
}
