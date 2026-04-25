import type { CSSProperties, ReactNode } from 'react';

import { Label } from '../../ui/parlour/index.ts';

export type WheelCabinetProps = {
  children: ReactNode;
  /** Top-crest content rendered inside the cabinet's left slot. */
  crest?: ReactNode;
  /** Top-crest content rendered inside the cabinet's right slot (e.g. stake). */
  meta?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function WheelCabinet({
  children,
  crest,
  meta,
  className,
  style,
}: WheelCabinetProps) {
  return (
    <div
      className={`wheel-cabinet ${className ?? ''}`}
      style={style}
      data-testid="wheel-cabinet"
    >
      {(crest || meta) && (
        <div className="wheel-cabinet__crest">
          <div className="wheel-cabinet__crest-left">{crest}</div>
          <div className="wheel-cabinet__crest-right">{meta}</div>
        </div>
      )}
      <div className="wheel-cabinet__inner">{children}</div>
    </div>
  );
}

export type ParlourCrestProps = {
  /** Kanji title (e.g. the parlour mark). */
  title: string;
  /** Subtitle in tracked mono ("Parlour No. 7"). */
  subtitle?: string;
};

export function ParlourCrest({ title, subtitle }: ParlourCrestProps) {
  return (
    <div>
      <div className="wheel-cabinet__crest-title">{title}</div>
      {subtitle && (
        <Label size={7} style={{ marginTop: 2 }}>
          {subtitle}
        </Label>
      )}
    </div>
  );
}
