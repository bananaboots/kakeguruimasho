/**
 * CinematicShell — Onboarding desktop wrapper.
 *
 * No-op at <1024px (children render as-is). At >=1024px, fills the viewport
 * with a felt+grain backdrop, places four corner ornate motifs, a velvet
 * swag along the top edge, and centers the children in a framed card.
 */
import type { ReactNode } from 'react';
import { useIsDesktop } from '../../lib/useIsDesktop.ts';
import { OrnateFrame } from './OrnateFrame.tsx';

export function CinematicShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <>{children}</>;
  return (
    <div className="cinematic-shell" data-testid="cinematic-backdrop">
      <VelvetSwag />
      <CornerMotif position="tl" />
      <CornerMotif position="tr" />
      <CornerMotif position="bl" />
      <CornerMotif position="br" />
      <div className="cinematic-shell__card">
        <OrnateFrame>{children}</OrnateFrame>
      </div>
    </div>
  );
}

function CornerMotif({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <div
      className={`cinematic-shell__corner cinematic-shell__corner--${position}`}
      aria-hidden="true"
    />
  );
}

/**
 * Velvet swag — opera-house valance along the top edge of the viewport.
 * Three scalloped folds drawn in lacquer red with gold-piped tassels at
 * the seams. Pure SVG, no external assets. Pointer-events: none so it
 * never blocks the content below.
 */
function VelvetSwag() {
  return (
    <svg
      className="cinematic-shell__swag"
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="swag-velvet" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-felt)" />
          <stop offset="55%" stopColor="var(--color-felt-deep)" />
          <stop offset="100%" stopColor="#0a0202" />
        </linearGradient>
        <linearGradient id="swag-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-gold)" />
          <stop offset="100%" stopColor="var(--color-gold-deep)" />
        </linearGradient>
      </defs>

      {/* Three scalloped folds. Each fold dips ~80px and rises back. */}
      <path
        d="M 0 0
           L 1200 0
           L 1200 30
           Q 1100 110 1000 30
           Q 900 110 800 30
           Q 700 110 600 30
           Q 500 110 400 30
           Q 300 110 200 30
           Q 100 110 0 30
           Z"
        fill="url(#swag-velvet)"
        stroke="url(#swag-gold)"
        strokeWidth="0.6"
        opacity="0.92"
      />

      {/* Gold piping along the upper edge. */}
      <line x1="0" y1="2" x2="1200" y2="2" stroke="url(#swag-gold)" strokeWidth="1.2" />

      {/* Tassels at every other seam (5 tassels across). */}
      {[0, 200, 400, 600, 800, 1000, 1200].map((x) => (
        <g key={x} transform={`translate(${x}, 80)`}>
          <circle cx="0" cy="0" r="3.5" fill="url(#swag-gold)" />
          <line x1="0" y1="3.5" x2="0" y2="22" stroke="url(#swag-gold)" strokeWidth="1" />
          <circle cx="0" cy="24" r="2.6" fill="var(--color-gold-deep)" />
        </g>
      ))}
    </svg>
  );
}
