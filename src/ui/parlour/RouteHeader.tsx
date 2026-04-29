/**
 * RouteHeader — tiny per-route title with a centered motif underneath.
 *
 * Designed to take up minimal vertical real estate (~40px total) while
 * still giving each top-level screen a visual identifier. Title sits
 * above a small motif glyph, both centered.
 */

import type { CSSProperties, ReactElement } from 'react';
import { Motif } from './Motif.tsx';

export interface RouteHeaderProps {
  title: string;
  /** id for the inner h1 — wire to `aria-labelledby` on the parent section. */
  titleId?: string;
  motifSize?: number;
  className?: string;
  style?: CSSProperties;
}

export function RouteHeader({
  title,
  titleId,
  motifSize = 18,
  className,
  style,
}: RouteHeaderProps): ReactElement {
  return (
    <header className={className ? `route-header ${className}` : 'route-header'} style={style}>
      <h1 className="route-header__title" {...(titleId ? { id: titleId } : {})}>
        {title}
      </h1>
      <div className="route-header__motif" aria-hidden>
        <Motif size={motifSize} />
      </div>
    </header>
  );
}
