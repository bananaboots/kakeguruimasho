import { describe, it, expect } from 'vitest';
import { THEMES, isThemeKey, type ThemeKey } from '../themes.ts';

describe('THEMES catalog', () => {
  it('includes kowloon as a known theme key', () => {
    expect(isThemeKey('kowloon')).toBe(true);
    expect(THEMES.kowloon).toBeDefined();
    expect(THEMES.kowloon.name).toBe('Kowloon Electric');
    expect(THEMES.kowloon.symbol).toBe('mahjong');
  });

  it('every theme either has a complete visual block or visual is undefined', () => {
    const requiredSlots = [
      'streak', 'potMini', 'chip', 'spin', 'cover', 'overlay', 'masthead',
    ] as const;
    for (const key of Object.keys(THEMES) as ThemeKey[]) {
      const v = THEMES[key].visual;
      if (v === undefined) continue;
      for (const slot of requiredSlots) {
        expect(v[slot], `${key}.visual.${slot} must be defined`).toBeDefined();
      }
    }
  });

  it('pachinko ships an explicit visual profile (documents defaults)', () => {
    expect(THEMES.pachinko.visual).toEqual({
      streak: 'lantern',
      potMini: 'koi-jar',
      chip: 'lacquer',
      spin: 'wheel',
      cover: 'parlour',
      overlay: 'paper-grain',
      masthead: 'engraved',
    });
  });

  it('kowloon ships its Triad Neon visual profile', () => {
    expect(THEMES.kowloon.visual).toEqual({
      streak: 'led-bar',
      potMini: 'token-tray',
      chip: 'arcade-token',
      spin: 'mahjong',
      cover: 'arcade-closet',
      overlay: 'scanlines',
      masthead: 'neon-vertical',
    });
  });
});
