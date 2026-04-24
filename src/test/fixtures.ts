// Deterministic fixtures for 3A's unit tests and Wave-2 imports.

import {
  DEFAULT_JAR_ID,
  type JarId,
  asClipId,
} from '../types/ids.ts';
import type { Clip, ClipColor } from '../types/clip.ts';

/** Hand-built bag with a known count per color + `goldCount` gold clips. */
export function buildBagFixture(params: {
  perColor: number;
  goldCount: number;
  colors?: ClipColor[];
  jarId?: JarId;
}): Clip[] {
  const jarId = params.jarId ?? DEFAULT_JAR_ID;
  const colors: ClipColor[] = params.colors ?? [
    'red',
    'blue',
    'green',
    'yellow',
    'purple',
    'pink',
  ];
  const out: Clip[] = [];
  let idx = 0;
  for (const color of colors) {
    for (let i = 0; i < params.perColor; i++) {
      out.push({
        id: asClipId(`clip_${color}_${i}_${idx++}`),
        jarId,
        kind: 'regular',
        color,
      });
    }
  }
  for (let i = 0; i < params.goldCount; i++) {
    out.push({ id: asClipId(`clip_gold_${i}`), jarId, kind: 'gold' });
  }
  return out;
}
