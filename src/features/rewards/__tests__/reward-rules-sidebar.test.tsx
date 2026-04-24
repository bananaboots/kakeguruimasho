// A19 VERBATIM copy assertion for <RewardRulesSidebar />.
// Spec: DECISIONS A19 + reference-methodology.txt page 03. The three headings
// and the Naked Rule body MUST match the PDF character-for-character. This is
// a do-not-cut item.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RewardRulesSidebar } from '../reward-rules-sidebar.tsx';
import { REWARD_RULE_HEADINGS, REWARD_RULE_BODIES } from '../reward-rules-copy.ts';

describe('<RewardRulesSidebar /> — A19 verbatim copy', () => {
  afterEach(() => {
    cleanup();
  });

  it('exports the three headings exactly as in the PDF', () => {
    expect(REWARD_RULE_HEADINGS).toEqual([
      'Highly Addicting',
      'Time or Money Wasting',
      'The Naked Rule',
    ]);
  });

  it('exports the Naked Rule body verbatim (including "casino is irrelevant." tagline)', () => {
    // PDF page 03 — rule #3 body.
    expect(REWARD_RULE_BODIES[2]).toBe(
      "Never do this reward 'naked' again — only through the system. Otherwise the casino is irrelevant.",
    );
  });

  it('renders all three headings and bodies in the DOM when expanded', async () => {
    const user = userEvent.setup();
    render(<RewardRulesSidebar />);
    await user.click(screen.getByRole('button', { name: /show/i }));

    for (const h of REWARD_RULE_HEADINGS) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument();
    }
    for (const body of REWARD_RULE_BODIES) {
      expect(screen.getByText(body)).toBeInTheDocument();
    }
  });

  it('starts collapsed by default (content hidden)', () => {
    render(<RewardRulesSidebar />);
    // Before expansion, no heading is rendered.
    for (const h of REWARD_RULE_HEADINGS) {
      expect(screen.queryByRole('heading', { name: h })).toBeNull();
    }
  });

  it('honors defaultExpanded=true', () => {
    render(<RewardRulesSidebar defaultExpanded={true} />);
    expect(screen.getByRole('heading', { name: 'The Naked Rule' })).toBeInTheDocument();
  });
});
