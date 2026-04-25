/**
 * Parlour primitives — the vintage-pachinko visual vocabulary.
 *
 * Use these in route-level files to compose screens that need the chassis
 * (engraved headings, ornate frames, casino chips, etc.). Lower-level
 * features that only need tokens can keep using CSS variables directly.
 */

export { Engraved } from './Engraved.tsx';
export type { EngravedProps } from './Engraved.tsx';

export { Label } from './Label.tsx';
export type { LabelProps } from './Label.tsx';

export { Chip, GoldChip } from './Chip.tsx';
export type { ChipProps } from './Chip.tsx';

export { OrnateFrame } from './OrnateFrame.tsx';
export type { OrnateFrameProps } from './OrnateFrame.tsx';

export { DecoDivider } from './DecoDivider.tsx';
export type { DecoDividerProps } from './DecoDivider.tsx';

export { BrassButton } from './BrassButton.tsx';
export type {
  BrassButtonProps,
  BrassButtonSize,
  BrassButtonVariant,
} from './BrassButton.tsx';

export { Motif } from './Motif.tsx';
export type { MotifProps } from './Motif.tsx';

export { Velvet } from './Velvet.tsx';
export type { VelvetProps } from './Velvet.tsx';

export { RitualGlyph } from './RitualGlyph.tsx';
export type { RitualGlyphKind, RitualGlyphProps } from './RitualGlyph.tsx';
