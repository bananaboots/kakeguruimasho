/**
 * Engraved — gilded display heading.
 *
 * Renders a serif headline with a brass-gradient text fill (top-light /
 * bottom-deep) and a hairline drop-shadow for the embossed feel. The colors
 * pull from the active theme via CSS variables, so it re-skins on theme swap
 * without prop changes.
 */

import { createElement, type CSSProperties, type ElementType, type ReactNode } from 'react';

export interface EngravedProps {
  children: ReactNode;
  /** Base font size in px. */
  size?: number;
  weight?: 400 | 500 | 600 | 700;
  letter?: number;
  align?: 'left' | 'center' | 'right';
  italic?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Engraved({
  children,
  size = 24,
  weight = 500,
  letter = 0.005,
  align = 'left',
  italic = false,
  as = 'div',
  className,
  style,
}: EngravedProps) {
  return createElement(
    as,
    {
      className,
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: size,
        fontWeight: weight,
        fontStyle: italic ? 'italic' : 'normal',
        letterSpacing: `${letter}em`,
        textAlign: align,
        background:
          'linear-gradient(180deg, var(--color-gold) 0%, var(--color-gold-deep) 55%, var(--color-gold) 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        textShadow: '0 1px 0 rgba(0, 0, 0, 0.32)',
        lineHeight: 1.1,
        ...style,
      },
    },
    children,
  );
}
