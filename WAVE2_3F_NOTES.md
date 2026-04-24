# Wave 2 · 3F — Reward Menu · Handoff Notes

## What shipped

### Feature files (all in `src/features/rewards/`)

- **`RewardMenu.tsx`** — per-tier list view with add / edit / archive / unarchive
  actions. Consumes default rewards from `useAppStore((s) => s.rewards[tier])`.
  Mounts the `<RewardEditor>` for add and edit flows. Archive toggles via
  pure slice reducers (`archiveReward` / `updateReward`).
- **`RewardEditor.tsx`** — modal add/edit form with a single `label` field.
  Wraps 3J's `<Dialog>` + `<Input>` + `<Button>`. Callers should pass a `key`
  that changes between add/edit invocations so the internal `useState` is
  re-initialized on remount (simpler + safer than a label-sync effect that
  could clobber live keystrokes).
- **`RewardPickerModal.tsx`** — post-wheel-win modal. Filters archived
  rewards; shows remaining as `<ul role="listbox">` with `<li role="option"
  tabIndex=0>` options (Enter/Space picks; click also picks). OR-3 empty
  state: "No rewards in this tier. Add one now or skip." with "Add reward"
  (opens inline editor) and "Skip (forfeit)" (calls `onDismiss`).
- **`reward-rules-sidebar.tsx`** — collapsible sidebar with the A19 VERBATIM
  copy of the 3 reward rules. Collapsed by default.
- **`reward-rules-copy.ts`** — the three headings + bodies split out as
  constants so the render component can remain a pure-component export
  (react-refresh rule). Tests import both.
- **`openRewardPicker.tsx`** — imperative `Promise<RewardId | null>` API for
  3E. Mounts one singleton React root on `document.body` the first time it
  is called and reuses it. Resolves with `null` on forfeit/dismiss.
- **`reward-actions.ts`** — small bridge helper. Reads current state, runs
  a pure slice reducer (`addReward` / `updateReward` / `archiveReward`),
  commits via the store's existing `hydrate` action. Preserves 3A's
  persistence scheduling without adding new `Actions` to the store.
- **`rewards.css`** — co-located styles using 3J design tokens only.
- **`index.ts`** — barrel.

### Route wiring (only `src/routes/Rewards.tsx` touched)

- Replaced the placeholder with the real `<RewardRulesSidebar/>` (collapsed
  by default) + `<Tabs T1|T2|T3/>` → `<RewardMenu tier=.../>`.

### Tests — 17 green

`src/features/rewards/__tests__/`:

- `RewardMenu.test.tsx` — CRUD happy paths (add, edit, archive), default
  rewards render, empty-label guard.
- `RewardPickerModal.test.tsx` — archived hidden, pick fires `onPick`,
  OR-3 empty state shows forfeit UI, "Add reward" opens inline editor.
- `reward-rules-sidebar.test.tsx` — A19 VERBATIM copy: the three headings
  match the PDF exactly, the Naked Rule body (including "Otherwise the
  casino is irrelevant.") matches exactly, render presence checks.
- `openRewardPicker.test.tsx` — resolves with picked `RewardId`, resolves
  with `null` on forfeit, idempotent-safe (a second call while one is open
  forfeits the prior promise as `null`).

## `openRewardPicker` API (for 3E, Wave 3)

```ts
// src/features/rewards/openRewardPicker.tsx
export function openRewardPicker(tier: Tier): Promise<RewardId | null>;
```

- Resolves with `RewardId` when the user taps a reward in the picker.
- Resolves with `null` on dismiss / Skip (forfeit) / Escape / overlay click.
- Idempotent-safe: if called while an existing picker is still open, the
  prior pending promise is resolved with `null` (treated as forfeit)
  **before** the new picker opens. 3E can treat this as "stale flow
  cancelled; new flow started" without worrying about dangling promises.
- Portal singleton: one `<div data-reward-picker-host>` is appended to
  `document.body` on first call; subsequent calls reuse it.
- Test helper: `__resetRewardPickerForTests()` unmounts the host.

Also exported: the slice-reducer bridge `applyRewardMutation(reducer)` in
`src/features/rewards/reward-actions.ts`. 3E should NOT need to call this
directly — picker-driven "Add reward" flows are internal to the modal.

## A19 copy decisions

- Heading casing matches the PDF's headline style (title case, not
  all-caps): `Highly Addicting`, `Time or Money Wasting`, `The Naked Rule`.
- Bodies are split per-rule; the test locks down the Naked Rule body string
  verbatim including the apostrophes and em dash: `"Never do this reward
  'naked' again — only through the system. Otherwise the casino is
  irrelevant."` — identical to reference-methodology.txt page 03.
- No validation code: A19 is a judgment call; no machine check.

## Cross-agent observations (not blocking 3F)

- **3A contract note.** The store's typed `Actions` surface intentionally
  does not include reward CRUD (confirmed by `WAVE1_3A_NOTES`). Per brief
  ("use existing `rewardsSlice` actions; do not add new ones"), I wrote a
  thin bridge (`reward-actions.ts`) that reads current state, applies a
  pure reducer, and routes through 3A's `hydrate` action. `hydrate`
  preserves the store's persistence-scheduling contract, so every reward
  mutation still hits IDB. This is a pragmatic choice; 3A may later
  elevate the 3 reward reducers into typed store actions without
  breaking my call sites (one-line swap in `applyRewardMutation`).

- **Dialog focus-trap interaction.** `src/ui/dialog.tsx` has a focus-trap
  `useEffect([open, handleKey])` where `handleKey` is `useCallback`-memoed
  against `onOpenChange`. Passing an inline `onOpenChange={(n) => ...}`
  from a re-rendering parent gives the Dialog a new callback identity per
  keystroke, which re-runs the effect and yanks focus back to the
  dialog-content `<div>` — typing is lost. Both `RewardEditor` and
  `RewardPickerModal` now pass a stable `useCallback` for `onOpenChange`
  (with a ref indirection for the latest `onCancel`/`onDismiss`). Worth
  flagging to 3J for a `<Dialog>` DX hardening (either memoize internally
  or document the stable-callback requirement).

- **`npm run build` status.** My files type-check clean
  (`npx tsc --noEmit` shows zero diagnostics in `src/features/rewards/**`
  or `src/routes/Rewards.tsx`). The full `npm run build` currently fails
  with unrelated type errors in `src/features/habits/HabitEditor.tsx` and
  `src/features/habits/HabitList.tsx` — 3D's scope, which my brief
  forbids me to touch. 3D's `HabitEditor.tsx` appears to pass
  `useAppStore(getStore())` (a value) where the selector signature
  expects `(s: Store) => T` (a function), causing `TS2345` errors
  cascading through the file. 3D or Phase 4 integration should resolve.

## Vitest run summary

- 17 / 17 new tests pass.
- Full repo run: 145 / 149 pass; the 4 failures are all in 3D's
  `src/features/habits/__tests__/` (pre-existing, unrelated to 3F).
