# Wave 2 · 3D — Habit Management UI · Handoff Notes

## What shipped

All files under `src/features/habits/`:

- `HabitList.tsx` — filters archived, Add button, per-row edit.
- `HabitEditor.tsx` — `<Dialog>` modal, supports count/minutes/sets/bundle unit kinds, validation, archive (soft-delete).
- `QuickLogButton.tsx` — primary CTA; count → opens StepEntry, minutes/sets → single-tap `completeHabit(id, 1)`, bundle → forwards to `onBundleTap`.
- `StepEntry.tsx` — `<Dialog>` with numeric input; preview line is `aria-live="polite"`; Log button disabled on 0 / non-integer; batched single `completeHabit(id, floor(steps/target))`; CSS keyframe clip-fly animation on confirm (no Framer Motion).
- `HygieneBundle.tsx` — 4 checkboxes, cutoff-anchored hygiene-day window, countdown "Bed by 01:00 — Nh Mm left", immediate award when all 4 before deadline.
- `InlineTimer.tsx` — v1 button-only per Q3; `settings.workTimerOptIn[habit.id]` stubbed for v1.1.
- `checkRetroactiveHygiene.ts` — on-boot reconciliation per A5; awards if prior-day bundle valid, else resets.
- `habits.css`, `index.ts` barrel.
- Tests (15): HabitList archived filter + quick-log, StepEntry batching + 0-step + non-integer, HygieneBundle award + 3-of-4 no-award + countdown, retroactive award + past-deadline no-award + today-bundle preserved.

`npx vitest run` → 149/149 green. `npm run build` clean.

## Mount points filled

- `src/routes/Home.tsx` → `<QuickLogButton>` grid in the `[3D]` slot.
- `src/routes/Habits.tsx` → `<HabitList>` + `<HygieneBundle>`.
- `src/App.tsx` → single `useEffect` runs `checkRetroactiveHygiene()` once on mount (StrictMode-safe via ref guard).

## Requests to 3A (v1.1 polish — do NOT block v1)

Please expose the following action creators so 3D can stop calling `store.setState()` directly. Each maps 1:1 to an existing pure slice reducer:

```ts
addHabit(habit: Habit): void
updateHabit(id: HabitId, patch: Partial<Omit<Habit,'id'|'createdAt'>>): void
archiveHabit(id: HabitId): void
checkHygieneSubItem(jarId: JarId, subItem: string): void
uncheckHygieneSubItem(jarId: JarId, subItem: string): void
resetHygieneBundle(jarId: JarId): void
```

Also: consider a `streak_incremented { streak: 'perHabit', habitId }` history variant so 3G can surface per-habit streak ticks (currently silent per 3A notes).

## Known v1 caveats

- Hygiene UI never fully "locks" for sub-midnight cutoffs (e.g. `01:00`). The cutoff-anchored hygiene-day gives the user a continuous 24h window ending at the next cutoff; missed windows are reset by `checkRetroactiveHygiene` on next open. Acceptable per A5 intent.
- HabitEditor's archive flow uses soft-archive (not hard-delete) to preserve history-event FK integrity.
