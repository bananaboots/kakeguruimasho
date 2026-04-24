// UUIDv7-style monotonic ID factory (R5 collision-proofing).

import type {
  ClipId,
  EventId,
  HabitId,
  MilestoneId,
  RewardId,
  BonusTimerId,
} from '../types/ids.ts';

// We construct a time-ordered pseudo-UUID rather than pulling a dep.
// Shape: <8-hex ms-timestamp-low>-<4-hex ms-high>-7<3-hex random>-<variant><3-hex random>-<12-hex random>
// "7" in position 12 marks it as v7-like. Collisions within the same ms are
// protected by a monotonic counter.

let counter = 0;
let lastMs = 0;

function hex(n: number, len: number): string {
  return n.toString(16).padStart(len, '0').slice(-len);
}

function randHex(bytes: number): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const buf = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(buf);
    let out = '';
    for (let i = 0; i < bytes; i++) out += hex(buf[i] ?? 0, 2);
    return out;
  }
  // Fallback (never preferred in prod).
  let out = '';
  for (let i = 0; i < bytes; i++) out += hex(Math.floor(Math.random() * 256), 2);
  return out;
}

/**
 * Generate a UUIDv7-style, time-ordered, collision-resistant ID.
 * Monotonic within a process: same-ms calls still produce strictly-ordered IDs.
 */
export function newUuid(): string {
  let ms = Date.now();
  if (ms <= lastMs) {
    counter += 1;
  } else {
    counter = 0;
    lastMs = ms;
  }
  // Encode counter into the low bits of the ms portion if we've wrapped.
  // (We can tolerate up to ~thousands of IDs per ms before a wrap affects
  // ordering; random tail still dedupes.)
  ms = lastMs + counter;

  const msHex = hex(ms, 12); // 48 bits → 12 hex chars
  const timeLow = msHex.slice(0, 8);
  const timeMid = msHex.slice(8, 12);
  const rand1 = randHex(2); // 4 hex
  const rand2 = randHex(2); // 4 hex
  const rand3 = randHex(6); // 12 hex
  // Variant: top two bits = 10 → '8', '9', 'a', or 'b'. We'll pick 'a' deterministically.
  const variant = 'a' + rand2.slice(1);
  return `${timeLow}-${timeMid}-7${rand1.slice(1)}-${variant}-${rand3}`;
}

// ---- Branded factories ----

export function newEventId(): EventId {
  return newUuid() as EventId;
}
export function newClipId(): ClipId {
  return newUuid() as ClipId;
}
export function newHabitId(): HabitId {
  return newUuid() as HabitId;
}
export function newRewardId(): RewardId {
  return newUuid() as RewardId;
}
export function newBonusTimerId(): BonusTimerId {
  return newUuid() as BonusTimerId;
}
export function newMilestoneId(): MilestoneId {
  return newUuid() as MilestoneId;
}
