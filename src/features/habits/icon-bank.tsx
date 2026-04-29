/**
 * RitualIcon — outline icon component used by the ritual icon picker
 * and the ritual card.
 *
 * Lucide already ships an outline aesthetic that matches `RitualGlyph`.
 * Constants and type-guards live in `icon-keys.ts` so this file stays
 * a "components only" module (react-refresh/only-export-components).
 */

import type { ReactElement, SVGProps } from 'react';
import {
  Activity,
  Bath,
  Bed,
  Bike,
  BookOpen,
  BrainCircuit,
  Brush,
  Coffee,
  Dumbbell,
  Flame,
  Footprints,
  GlassWater,
  Heart,
  ListChecks,
  Moon,
  Music,
  Pencil,
  Pill,
  Shirt,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Utensils,
} from 'lucide-react';
import type { IconKey } from './icon-keys.ts';

type IconComponent = (props: SVGProps<SVGSVGElement> & { size?: number | string }) => ReactElement;

const REGISTRY: Record<IconKey, IconComponent> = {
  Activity: Activity as unknown as IconComponent,
  Bath: Bath as unknown as IconComponent,
  Bed: Bed as unknown as IconComponent,
  Bike: Bike as unknown as IconComponent,
  BookOpen: BookOpen as unknown as IconComponent,
  BrainCircuit: BrainCircuit as unknown as IconComponent,
  Brush: Brush as unknown as IconComponent,
  Coffee: Coffee as unknown as IconComponent,
  Dumbbell: Dumbbell as unknown as IconComponent,
  Flame: Flame as unknown as IconComponent,
  Footprints: Footprints as unknown as IconComponent,
  GlassWater: GlassWater as unknown as IconComponent,
  Heart: Heart as unknown as IconComponent,
  ListChecks: ListChecks as unknown as IconComponent,
  Moon: Moon as unknown as IconComponent,
  Music: Music as unknown as IconComponent,
  Pencil: Pencil as unknown as IconComponent,
  Pill: Pill as unknown as IconComponent,
  Shirt: Shirt as unknown as IconComponent,
  Sparkles: Sparkles as unknown as IconComponent,
  Sun: Sun as unknown as IconComponent,
  Target: Target as unknown as IconComponent,
  Trash2: Trash2 as unknown as IconComponent,
  Utensils: Utensils as unknown as IconComponent,
};

export interface RitualIconProps {
  iconKey: IconKey;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function RitualIcon({
  iconKey,
  size = 22,
  color = 'var(--color-gold)',
  strokeWidth = 1.5,
  className,
}: RitualIconProps): ReactElement {
  const Cmp = REGISTRY[iconKey];
  return (
    <Cmp
      width={size}
      height={size}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    />
  );
}
