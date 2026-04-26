/**
 * CinematicShell — Onboarding desktop wrapper.
 *
 * No-op at <1024px (children render as-is). At >=1024px, fills the viewport
 * with a felt+grain backdrop, places four corner ornate motifs, and centers
 * the children in a framed card.
 *
 * Velvet swag along the top edge is a v1.1 polish item -- shipped here with
 * just the four corner motifs to keep the PR scope tight.
 */
import type { ReactNode } from 'react';
import { useIsDesktop } from '../../lib/useIsDesktop.ts';
import { OrnateFrame } from './OrnateFrame.tsx';

export function CinematicShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <>{children}</>;
  return (
    <div className="cinematic-shell" data-testid="cinematic-backdrop">
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
