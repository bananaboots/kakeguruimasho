/**
 * themes.ts — Parlour theme catalog.
 *
 * Each theme is a bundle of (palette + typography + copy + motif). The visual
 * tokens live in `themes.css` keyed by `[data-theme="<key>"]`; this file is the
 * single source of truth for theme metadata that JS/TS needs at runtime —
 * names, taglines, motif glyph keys, copy strings, and status.
 *
 * Adding a new theme (e.g. "kowloon"):
 *   1. Append a `ThemeKey` literal here.
 *   2. Add an entry to `THEMES` with name/tagline/copy/symbol/status.
 *   3. Add a `[data-theme="kowloon"] { … }` block to `themes.css`.
 *   4. (Optional) Add a new motif case to `<Motif>` if `symbol` is novel.
 *
 * The provider (`theme-provider.tsx`) writes `data-theme` on `<html>`, which
 * cascades to every CSS-variable-driven surface in the app.
 */

export type ThemeKey =
  | 'pachinko'
  | 'house'
  | 'riding'
  | 'imperial'
  | 'ukiyoe'
  | 'celestial'
  | 'speakeasy';

export type MotifSymbol =
  | 'paclilly'
  | 'fleur'
  | 'wolf'
  | 'dragon'
  | 'wave'
  | 'star'
  | 'keyhole';

export interface ThemeCopy {
  /** Primary CTA on the spin screen. */
  spinCta: string;
  /** Verb used when a clip is awarded ("Caught", "Drawn", "Gathered"). */
  earned: string;
  /** Word for the in-progress clip pile ("Tray", "Your Hand", "Pocket"). */
  hand: string;
  /** Word for the source bag ("Hopper", "The Bag", "Grandmother's Sack"). */
  bag: string;
  /** Display label for jackpot reveal ("大当たり", "Le Grand Prix"). */
  jackpot: string;
  /** Wording for a near-miss spin. */
  nearMiss: string;
}

export interface ThemeMeta {
  name: string;
  tagline: string;
  copy: ThemeCopy;
  symbol: MotifSymbol;
  /** `ready` themes have full bespoke art; `stub` themes are token-only. */
  status: 'ready' | 'stub';
}

export const THEMES: Record<ThemeKey, ThemeMeta> = {
  pachinko: {
    name: 'Vintage Pachinko',
    tagline: '昭和 · Lacquer Parlour, 1962',
    symbol: 'paclilly',
    status: 'ready',
    copy: {
      spinCta: 'Pull the Lever',
      earned: 'Caught',
      hand: 'Tray',
      bag: 'Hopper',
      jackpot: '大当たり · Ōatari',
      nearMiss: 'Inches short',
    },
  },
  house: {
    name: 'Maison Clip',
    tagline: 'La Maison · Belle Époque',
    symbol: 'fleur',
    status: 'stub',
    copy: {
      spinCta: 'Place Wager',
      earned: 'Drawn',
      hand: 'Your Hand',
      bag: 'The Bag',
      jackpot: 'Le Grand Prix',
      nearMiss: 'À un cheveu près',
    },
  },
  riding: {
    name: 'Storybook Crimson',
    tagline: 'Once in the Wood · Folio MDCCCLXXIII',
    symbol: 'wolf',
    status: 'stub',
    copy: {
      spinCta: 'Tug the Ribbon',
      earned: 'Gathered',
      hand: 'The Basket',
      bag: "Grandmother's Sack",
      jackpot: 'Through the Wood',
      nearMiss: "A wolf's breath",
    },
  },
  imperial: {
    name: 'Imperial Gold',
    tagline: '金 · Fortune House, 1888',
    symbol: 'dragon',
    status: 'stub',
    copy: {
      spinCta: 'Invoke Fortune',
      earned: 'Gathered',
      hand: '掌 Palm',
      bag: '袋 Pouch',
      jackpot: 'Imperial Bounty',
      nearMiss: 'A breath away',
    },
  },
  ukiyoe: {
    name: 'Neon Ukiyo-e',
    tagline: '浮世 · Floating World',
    symbol: 'wave',
    status: 'stub',
    copy: {
      spinCta: 'Summon the Wave',
      earned: 'Caught',
      hand: "Crane's Catch",
      bag: 'Wave Bag',
      jackpot: 'Great Wave',
      nearMiss: 'A crest away',
    },
  },
  celestial: {
    name: 'Celestial',
    tagline: 'Under the Azure Crown',
    symbol: 'star',
    status: 'stub',
    copy: {
      spinCta: 'Consult the Stars',
      earned: 'Gathered',
      hand: 'Constellation',
      bag: 'The Cosmos',
      jackpot: 'Zenith',
      nearMiss: 'A parallax away',
    },
  },
  speakeasy: {
    name: 'Speakeasy',
    tagline: 'Knock Twice · Est. 1923',
    symbol: 'keyhole',
    status: 'stub',
    copy: {
      spinCta: 'Spin the Back Room',
      earned: 'On the House',
      hand: 'Pocket',
      bag: 'House Stash',
      jackpot: 'Full House',
      nearMiss: 'Missed by a whisker',
    },
  },
};

export const DEFAULT_THEME: ThemeKey = 'pachinko';

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && value in THEMES;
}
