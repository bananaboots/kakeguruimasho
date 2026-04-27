/**
 * HandTrayCard — Pachinko玉受け (tama-uke) tray card for Home.
 *
 * Source: `pachinko-screens.jsx:296` (PachinkoTrayCard). Replaces the simple
 * <HandSummary> on Home with the bespoke tray treatment: brass-corner nails,
 * inset gold borders, a clip pile preview, a "Today's Catch" engraved counter,
 * and a small lever CTA that links to /spin.
 */

import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { useAppStore } from '../../state/store.ts';
import { selectHand } from '../../state/selectors.ts';
import type { JarId } from '../../types/ids.ts';
import type { Clip } from '../../types/clip.ts';
import { localDateOf, todayLocal } from '../../lib/time.ts';
import { Chip, Engraved, GoldChip, Label } from '../../ui/parlour/index.ts';
import { ArcadeToken } from '../../ui/kowloon/index.ts';
import { useTheme } from '../../styles/theme-context.ts';
import { CLIP_HEX } from './clip-colors.ts';

const PILE_MAX = 16;

export interface HandTrayCardProps {
  jarId?: JarId;
}

export function HandTrayCard({ jarId }: HandTrayCardProps = {}): ReactElement {
  const activeJarId = useAppStore((s) => s.activeJarId);
  const resolvedJarId = jarId ?? activeJarId;
  const hand = useAppStore((s) => selectHand(s, resolvedJarId));
  const todaysCatch = useAppStore((s) => {
    const today = todayLocal();
    let n = 0;
    for (const ev of s.history) {
      if (
        ev.kind === 'clip_earned' &&
        ev.jarId === resolvedJarId &&
        localDateOf(ev.at) === today
      ) {
        n += 1;
      }
    }
    return n;
  });
  const { themeMeta } = useTheme();

  const goldCount = hand.filter((c) => c.kind === 'gold').length;
  const pile = hand.slice(0, PILE_MAX);
  const chipVariant = themeMeta.visual?.chip ?? 'lacquer';

  const renderClip = (c: Clip): ReactElement => {
    switch (chipVariant) {
      case 'arcade-token':
        return c.kind === 'gold' ? (
          <ArcadeToken key={c.id} color="#e8c682" denom="★" size={22} />
        ) : (
          <ArcadeToken
            key={c.id}
            color={CLIP_HEX[c.color]}
            denom=""
            size={22}
          />
        );
      case 'lacquer':
        return c.kind === 'gold' ? (
          <GoldChip key={c.id} size={22} />
        ) : (
          <Chip key={c.id} color={CLIP_HEX[c.color]} size={22} />
        );
    }
  };

  return (
    <Link
      to="/spin"
      className="hand-tray"
      data-testid="hand-summary"
      aria-label={`${hand.length} clips in hand, ${todaysCatch} caught today — tap to spin`}
    >
      <span className="hand-tray__nail" data-pos="tl" aria-hidden />
      <span className="hand-tray__nail" data-pos="tr" aria-hidden />
      <span className="hand-tray__nail" data-pos="bl" aria-hidden />
      <span className="hand-tray__nail" data-pos="br" aria-hidden />

      <div className="hand-tray__header">
        <div className="hand-tray__title">
          <span className="hand-tray__kanji" aria-hidden>
            玉
          </span>
          <Label size={9}>The Tray · {hand.length} caught</Label>
        </div>
        {goldCount > 0 ? (
          <span className="hand-tray__gold-count">
            {goldCount} <span aria-hidden>★</span>
          </span>
        ) : null}
      </div>

      {pile.length > 0 ? (
        <div className="hand-tray__pile" aria-hidden>
          {pile.map((c: Clip) => renderClip(c))}
          {hand.length > PILE_MAX ? (
            <span className="hand-tray__more">+{hand.length - PILE_MAX}</span>
          ) : null}
        </div>
      ) : (
        <p className="hand-tray__empty">Log a ritual to fill the tray.</p>
      )}

      <div className="hand-tray__rule" aria-hidden />

      <div className="hand-tray__footer">
        <div>
          <Label size={8}>Today's Catch</Label>
          <Engraved size={22} align="left" style={{ marginTop: 2 }}>
            +{todaysCatch} 玉
          </Engraved>
        </div>
        <span className="hand-tray__cta">{themeMeta.copy.spinCta} →</span>
      </div>
    </Link>
  );
}

export default HandTrayCard;
