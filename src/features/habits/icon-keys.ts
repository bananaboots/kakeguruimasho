/**
 * icon-keys — constants + type-guards for the ritual icon picker.
 *
 * Lives in its own non-component file so `react-refresh/only-export-components`
 * is satisfied: `icon-bank.tsx` exports only the `RitualIcon` component.
 */

export type IconKey =
  | 'Activity'
  | 'Bath'
  | 'Bed'
  | 'Bike'
  | 'BookOpen'
  | 'BrainCircuit'
  | 'Brush'
  | 'Coffee'
  | 'Dumbbell'
  | 'Flame'
  | 'Footprints'
  | 'GlassWater'
  | 'Heart'
  | 'ListChecks'
  | 'Moon'
  | 'Music'
  | 'Pencil'
  | 'Pill'
  | 'Shirt'
  | 'Sparkles'
  | 'Sun'
  | 'Target'
  | 'Trash2'
  | 'Utensils';

export const ICON_KEYS: readonly IconKey[] = [
  'Activity',
  'Bath',
  'Bed',
  'Bike',
  'BookOpen',
  'BrainCircuit',
  'Brush',
  'Coffee',
  'Dumbbell',
  'Flame',
  'Footprints',
  'GlassWater',
  'Heart',
  'ListChecks',
  'Moon',
  'Music',
  'Pencil',
  'Pill',
  'Shirt',
  'Sparkles',
  'Sun',
  'Target',
  'Trash2',
  'Utensils',
];

const ICON_KEY_SET: ReadonlySet<string> = new Set(ICON_KEYS);

export function isIconKey(value: unknown): value is IconKey {
  return typeof value === 'string' && ICON_KEY_SET.has(value);
}
