# Wave 2 · 3B — Bag & Draw Engine · Handoff Notes

## What shipped

### Pure engine (`src/features/bag/bag.engine.ts`)
- `drawClip(bag, rng) -> { drawn, bag }` — uniform-random without-replacement pick. Returns a new bag array; input is never mutated (R4). Throws `RangeError` on empty bag — callers own refill.
- `refillBag(composition, jarId, idFactory) -> Clip[]` — builds a fresh bag: `color[0] ×N, ..., color[last] ×N, gold ×G`. Every clip is tagged with the supplied `jarId`. `idFactory` is injected so the store passes `newClipId` (UUIDv7) and tests can pass a counter.
- `bagComposition(bag) -> Record<ClipColor|'gold', number>` — per-kind counts.
- `shuffleBag(bag, rng)` — extra helper (Fisher–Yates, pure). Not required by `drawClip` (index selection is already uniform); exported for future UI that wants a scrambled render.

Zero store imports. No I/O. RNG is the only non-pure input and it's a parameter.

### Engine tests (`src/features/bag/bag.engine.test.ts`, 14 tests)
- **`refillBag`**: correct total, correct per-color + gold counts, honors custom compositions, tags clips with jarId.
- **`drawClip`**: removes exactly the drawn clip, never mutates the input (R4), drains 61-clip bag to 0 and re-seeds to starting composition on refill, throws on empty bag, deterministic for fixed seed, different seeds produce different sequences.
- **Distribution (spec §10)**: 10k draws with auto-refill at the default D2 bag:
  - Per-color shares within **±2%** of `regularPerColor / 61`.
  - Gold share within **±1%** of `1/61` (~1.64%).
  - Sum of outcomes equals N (no lost clips).

All randomness seeded via `seededRng(seed)` from `src/test/seeded-rng.ts` — no test-flake mitigations required; determinism is structural.

### UI (`src/features/bag/BagCompositionView.tsx` + `.css`)
- Read-only grid of color tiles + a distinct gold tile using the 3J `--color-gold` + `--color-gold-glow` tokens.
- Mobile-first: `grid-template-columns: repeat(auto-fit, minmax(56px, 1fr))`, `min-height: var(--tap-target-min)`.
- Accessible: `aria-labelledby` on the section, per-tile `aria-label` of form `"10 red"`, total-remaining live label.

### Component test (`src/features/bag/BagCompositionView.test.tsx`, 3 tests)
- Renders one tile per default color + a gold tile with correct counts.
- Shows total of 61 in the header.
- Gold tile exposes `data-color="gold"` for styling hooks.

## Store integration — stub replaced

**Yes, the stub is gone.** `src/state/store.ts > drawClipFromBag` now delegates to the pure engine:

```ts
// before (Wave 1 stub):
const idx = currentRng.nextInt(bag.length);
const clip = bag[idx]!;
const { state: afterRemove } = jarsSlice.removeClipFromBag(s, jarId, clip.id);

// after (Wave 2):
const { drawn: clip, bag: nextBag } = drawClipFromBagPure(bag, currentRng);
const afterRemove = jarsSlice.setBag(s, jarId, nextBag);
```

The bag refill path also moved from `refillBagInline` + lazy defaults import to the pure `refillBag(composition, jarId, newClipId)`. The inline helper + lazy `jsrSeed` wildcard import were deleted. Public `Actions` surface is unchanged; auto-refill + `bag_refilled` history emission + single-transaction semantics are preserved.

Verification: all 58 prior tests still pass (including `store: composite actions > auto-refills bag when it empties mid-session`).

## Build / test status

- `npx vitest run` — **75/75 green** (58 prior + 14 engine + 3 component).
- `npm run build` — my files typecheck clean (`npx tsc --noEmit` reports zero errors in `src/features/bag/**` and `src/state/store.ts`). The top-level build currently fails due to **3D (habits)** and **3F (rewards)** in-flight files (`src/features/habits/index.ts` references files not yet written; `src/features/rewards/openRewardPicker.ts` has a syntax error). Those are outside 3B's scope per the brief's MUST NOT TOUCH list. Integration (Phase 4) will flush once the other Wave 2 agents complete.

## Test-flake mitigations

None needed. The distribution tests use fixed seeds (1234/2345/3456) and the ±2%/±1% windows at N=10k have ~5σ headroom against the binomial standard error — reruns are bit-for-bit identical.

## Key design notes

- **Gold is not a separate probability math.** The engine treats gold as just another array entry with `kind: "gold"`. Uniform index selection + per-entry identity = gold rate automatically equals `goldCount / totalClips`. This keeps the code honest to spec §5.3 ("indistinguishable until drawn") and eliminates a whole class of "we accidentally biased gold" bugs.
- **Engine is refill-agnostic.** `drawClip` throws on empty rather than silently refilling. The store owns the atomic `(refill → bag_refilled event → draw)` transaction, which is where the history-log guarantee lives. This keeps the engine trivially unit-testable and the store is the single source of truth for history events.
- **`<BagCompositionView />` selects the bag array, not the counts object.** Selecting `selectBagCompositionCounts(s, jarId)` directly would return a fresh object on every render and break React 19's `useSyncExternalStore` snapshot caching (confirmed by the initial test-run failure). The component now selects the stable `bag` reference and derives counts via `useMemo` on top of `bagComposition(bag)` — same result, no infinite-render loop.
