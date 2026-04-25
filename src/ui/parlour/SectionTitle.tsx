/**
 * SectionTitle — kanji + tracked label + gradient rule.
 *
 * Source: `pachinko-screens.jsx:284` (PachinkoSectionTitle). Used as the
 * heading style across Vintage Pachinko sections (Rituals, Discount a
 * Ritual, Unlock the Tiers). The `right` slot is for an optional
 * trailing badge or count.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Label } from './Label.tsx';

export interface SectionTitleProps {
  /** Single kanji or short kanji compound (e.g. "行", "段", "択"). */
  jp: string;
  /** Latin label rendered in tracked uppercase mono ("Rituals · Tap to Log"). */
  en: string;
  right?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function SectionTitle({ jp, en, right, className, style }: SectionTitleProps) {
  return (
    <div className={`parlour-section-title ${className ?? ''}`} style={style}>
      <span className="parlour-section-title__kanji" aria-hidden>
        {jp}
      </span>
      <Label size={9}>{en}</Label>
      <span className="parlour-section-title__rule" aria-hidden />
      {right}
    </div>
  );
}
