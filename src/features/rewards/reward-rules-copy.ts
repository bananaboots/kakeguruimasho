/**
 * A19 VERBATIM copy of the 3 Reward Rules from reference-methodology.txt
 * page 03. See reward-rules-sidebar.tsx for the rendering component.
 *
 * DO NOT paraphrase. The test suite asserts these string values character-
 * for-character.
 */

export const REWARD_RULE_HEADINGS = [
  'Highly Addicting',
  'Time or Money Wasting',
  'The Naked Rule',
] as const;

export const REWARD_RULE_BODIES = [
  "Thinking about it should give you a rush. If it doesn't spike your dopamine on its own, it won't power the system.",
  'Pick something you regret: doomscrolling, phone games, takeout. You want the system to REDUCE this.',
  "Never do this reward 'naked' again — only through the system. Otherwise the casino is irrelevant.",
] as const;
