/**
 * StreakMilestoneCelebration — modal celebration for daily-streak century /
 * millennium hits.
 *
 * Rendered globally in App.tsx. Reads `pendingStreakCelebration` from the
 * store and shows a centered Dialog with the streak number, the chip
 * payout, and a "Claim & Continue" CTA that fires
 * `acknowledgeStreakMilestone`. The clips themselves are already in the
 * user's hand — this modal is purely the celebration moment.
 *
 * Visual language mirrors the Tier-3 reveal: radiating gold rays, a
 * confetti scatter behind the chips, and the parlour kanji (連勝) above
 * the streak value. Centuries get a smaller payout fan; millennia get a
 * fuller one with a "JACKPOT" overstamp.
 */

import { useMemo, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog.tsx';
import { BrassButton, Chip, GoldChip } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from '../spin/clip-colors.ts';
import { useAppStore } from '../../state/store.ts';
import { DEFAULT_CLIP_COLORS, type ClipColor } from '../../types/clip.ts';
import './streakMilestone.css';

export function StreakMilestoneCelebration(): ReactElement | null {
  const pending = useAppStore((s) => s.pendingStreakCelebration);
  const acknowledge = useAppStore((s) => s.actions.acknowledgeStreakMilestone);

  // Stable color sequence for the chip fan -- deterministic across renders
  // so the celebration doesn't flicker if the modal re-renders.
  const fanColors = useMemo<ClipColor[]>(() => {
    if (!pending) return [];
    return Array.from({ length: pending.regularChips }, (_, i) => {
      return DEFAULT_CLIP_COLORS[i % DEFAULT_CLIP_COLORS.length]!;
    });
  }, [pending]);

  if (!pending) return null;

  const { streakValue, tier, regularChips, goldChips } = pending;
  const isMillennium = tier === 'millennium';

  return (
    <Dialog open onOpenChange={(o) => !o && acknowledge()}>
      <DialogContent
        className="streak-celebration"
        aria-labelledby="streak-celebration-title"
      >
        {/* Radiating rays — sit behind everything, pointer-events: none */}
        <div className="streak-celebration__rays" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="streak-celebration__ray"
              style={{ transform: `rotate(${(i * 360) / 24}deg)` }}
            />
          ))}
        </div>

        <div className="streak-celebration__kicker">連勝 · DAILY STREAK</div>

        <DialogTitle
          id="streak-celebration-title"
          className="streak-celebration__title"
        >
          {streakValue}
          <span className="streak-celebration__title-unit">DAYS</span>
        </DialogTitle>

        {isMillennium && (
          <div className="streak-celebration__overstamp" aria-hidden>
            JACKPOT
          </div>
        )}

        <DialogDescription className="streak-celebration__description">
          {isMillennium
            ? `A thousand days at the parlour. ${regularChips} clips and ${goldChips} gold dispensed to your tray.`
            : `${streakValue} days kept. ${regularChips} clips and ${goldChips} gold dispensed to your tray.`}
        </DialogDescription>

        <div className="streak-celebration__fan" aria-hidden>
          {fanColors.map((c, i) => (
            <Chip key={`r-${i}`} color={CLIP_HEX[c]} size={28} />
          ))}
          {Array.from({ length: goldChips }, (_, i) => (
            <GoldChip key={`g-${i}`} size={32} denom="★" />
          ))}
        </div>

        <BrassButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={acknowledge}
        >
          Claim & Continue
        </BrassButton>
      </DialogContent>
    </Dialog>
  );
}
