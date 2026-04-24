/**
 * HelpScreen — "How it works" recap (3I).
 *
 * Condensed methodology from the reference PDF. We embed the key
 * excerpts inline rather than shipping the PDF itself — keeps the
 * bundle small and screen-readable.
 *
 * Also surfaces a link to SpoonFedStudy's full guide for users who
 * want the source material.
 */

import type { ReactElement } from 'react';
import { REWARD_RULE_BODIES, REWARD_RULE_HEADINGS } from '../rewards/reward-rules-copy.ts';

const PDF_SOURCE_URL = 'https://spoonfedstudy.com/';

export function HelpScreen(): ReactElement {
  return (
    <section
      className="settings__card"
      aria-labelledby="help-title"
      data-testid="help-screen"
    >
      <header>
        <h2 id="help-title" className="settings__title">
          How it works
        </h2>
        <p className="settings__hint">
          A quick recap. Open any time you forget why you're here.
        </p>
      </header>

      <div>
        <h3 className="settings__title" style={{ fontSize: 'var(--text-base)' }}>
          Why it works
        </h3>
        <p className="settings__hint">
          Your brain isn't motivated by big rewards. It's motivated by{' '}
          <strong>maybe</strong>. A guaranteed reward goes stale; an
          uncertain one produces one of the biggest natural dopamine
          spikes ever measured. We hijack that.
        </p>
      </div>

      <div>
        <h3 className="settings__title" style={{ fontSize: 'var(--text-base)' }}>
          Three pieces
        </h3>
        <ul className="settings__help-list">
          <li>
            <strong>The wheel.</strong> Configurable slices T1 / T2 /
            T3 / BONUS / JACKPOT.
          </li>
          <li>
            <strong>The clips.</strong> Earn one per habit completion.
            Match colors from your hand to unlock tiers: 2 = T1, 3 =
            T2, gold = instant T3.
          </li>
          <li>
            <strong>The jar.</strong> Every clip earned drops $1 in.
            Hit Mini, Mid, or Moonshot — you decide what each one is.
          </li>
        </ul>
      </div>

      <div>
        <h3 className="settings__title" style={{ fontSize: 'var(--text-base)' }}>
          The 3 reward rules
        </h3>
        <ul className="settings__help-list">
          {REWARD_RULE_HEADINGS.map((h, i) => (
            <li key={h}>
              <strong>{h}.</strong> {REWARD_RULE_BODIES[i]}
            </li>
          ))}
        </ul>
      </div>

      <p className="settings__hint">
        Full methodology:{' '}
        <a
          href={PDF_SOURCE_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
          SpoonFedStudy · The Slot Machine Habit System
        </a>
      </p>
    </section>
  );
}
