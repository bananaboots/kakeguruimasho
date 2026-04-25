/**
 * BagCompositionView — read-only visual breakdown of the bag (Wave 2 3B).
 *
 * Shows per-color counts as small swatches + a dedicated gold tile. Mobile-first
 * grid that wraps to one row on phones and reflows on wider screens.
 *
 * Data source: `useAppStore` + `selectBagCompositionCounts(jarId)` from 3A.
 * This component does NOT call the bag engine directly — the store's
 * `drawClipFromBag` path already delegates to the engine, so the selector
 * reflects the true live bag.
 */

import { useMemo, type ReactElement } from 'react';

import { useAppStore } from '../../state/store.ts';
import { selectBag } from '../../state/selectors.ts';
import { bagComposition } from './bag.engine.ts';
import type { ClipColor } from '../../types/clip.ts';
import type { JarId } from '../../types/ids.ts';
import { DEFAULT_CLIP_COLORS } from '../../types/clip.ts';
import { Chip, GoldChip } from '../../ui/parlour/index.ts';
import { CLIP_HEX } from '../spin/clip-colors.ts';

import './bag-composition-view.css';

export type BagCompositionViewProps = {
  jarId: JarId;
  /** Optional override for the color ordering (defaults to DEFAULT_CLIP_COLORS). */
  colors?: readonly ClipColor[];
  className?: string;
};

export default function BagCompositionView(props: BagCompositionViewProps): ReactElement {
  const { jarId, colors = DEFAULT_CLIP_COLORS, className } = props;

  // Select the bag array reference (stable until the bag mutates) and derive
  // counts via useMemo. Passing a fresh object through useAppStore directly
  // would thrash React 19's useSyncExternalStore snapshot check — we pipe
  // through a stable reference and memoize the count computation.
  const bag = useAppStore((s) => selectBag(s, jarId));
  const counts = useMemo(() => bagComposition(bag), [bag]);
  const total = colors.reduce((sum, c) => sum + counts[c], 0) + counts.gold;

  return (
    <section
      className={cn('bag-composition', className)}
      aria-labelledby={`bag-composition-title-${jarId}`}
      data-testid="bag-composition-view"
    >
      <header className="bag-composition__header">
        <h3 id={`bag-composition-title-${jarId}`} className="bag-composition__title">
          Bag
        </h3>
        <span
          className="bag-composition__total"
          aria-label={`${total} clips remaining`}
        >
          {total} <span className="bag-composition__total-label">clips</span>
        </span>
      </header>

      <ul className="bag-composition__grid" role="list">
        {colors.map((color) => (
          <li
            key={color}
            className="bag-composition__tile"
            data-color={color}
            aria-label={`${counts[color]} ${color}`}
          >
            <Chip color={CLIP_HEX[color]} size={24} ariaLabel={`${color} clip`} />
            <span className="bag-composition__count">{counts[color]}</span>
            <span className="bag-composition__label">{color}</span>
          </li>
        ))}
        <li
          className="bag-composition__tile bag-composition__tile--gold"
          data-color="gold"
          aria-label={`${counts.gold} gold`}
        >
          <GoldChip size={24} ariaLabel="Gold clip" />
          <span className="bag-composition__count">{counts.gold}</span>
          <span className="bag-composition__label">gold</span>
        </li>
      </ul>
    </section>
  );
}

function cn(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}
