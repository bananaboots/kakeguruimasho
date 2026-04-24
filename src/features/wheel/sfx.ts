// Web Audio SFX hooks for the wheel + bonus timer.
//
// Contract (SPEC §7.1 "optional", §12 "all respect mute setting"):
//   - Silent fall-through on decode/context errors (OR-4: WebM/Opus only;
//     if a specific iOS version can't decode, we never make noise — never
//     break user flow).
//   - Respect `settings.sfxEnabled`; called modules pass it explicitly.
//   - Zero assets in the main bundle: tiny synthesized tones, no file fetch.
//
// Design note — why synthesized, not sampled:
//   The spec lists "spin tick / win chime / near-miss / gold fanfare /
//   timer tick." Shipping an audio sprite costs ~30 KB and risks iOS Safari
//   decode quirks. Instead we synthesize simple oscillator tones via
//   AudioContext. No file IO, no manifest, no CORS, <1 KB of JS.
//
//   If the team later wants richer samples, swap this module's internals —
//   the exported hook shape stays stable.

type ToneSpec = {
  /** Frequency in Hz. */
  freq: number;
  /** Duration in seconds. */
  dur: number;
  /** Gain peak (0..1). */
  gain: number;
  /** Oscillator waveform. */
  type: OscillatorType;
  /** Optional glide target (Hz) for swoops. */
  glideTo?: number;
};

let ctx: AudioContext | null = null;
let unlocked = false;

/** Lazily create/unlock the AudioContext. iOS requires a user-gesture resume. */
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (!unlocked && ctx.state === 'suspended') {
      // Resume is async; call and forget. If it fails, playTone still no-ops.
      void ctx.resume();
    }
    unlocked = true;
    return ctx;
  } catch {
    return null;
  }
}

/** Play a single synthesized tone. All errors swallowed. */
function playTone(spec: ToneSpec, startOffset = 0): void {
  const audio = getCtx();
  if (!audio) return;
  try {
    const now = audio.currentTime + startOffset;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.glideTo !== undefined) {
      osc.frequency.linearRampToValueAtTime(spec.glideTo, now + spec.dur);
    }
    // Short attack, quick release — keeps it crisp, no clicks.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(spec.gain, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + spec.dur + 0.02);
  } catch {
    // Swallow: OR-4 "silent fall-through on decode error".
  }
}

/** Play a sequence of tones, each scheduled after the previous. */
function playSequence(specs: ToneSpec[]): void {
  let offset = 0;
  for (const s of specs) {
    playTone(s, offset);
    offset += s.dur;
  }
}

// ---- Public API ----

export type SfxEnabledGetter = () => boolean;

/**
 * Build an sfx player bound to a "settings.sfxEnabled" getter. The hook is
 * plain (non-React) so non-component callers (engine, animation controllers)
 * can use it.
 */
export function createSfx(isEnabled: SfxEnabledGetter): Sfx {
  const gate = (fn: () => void) => {
    if (!isEnabled()) return;
    fn();
  };

  return {
    /** A ticky click during wheel deceleration; call per passed segment. */
    spinTick(): void {
      gate(() =>
        playTone({ freq: 880, dur: 0.03, gain: 0.08, type: 'square' }),
      );
    },
    /**
     * Win chime — pitch rises with tier. T1 light, T2 medium, T3 full fanfare.
     * Maps to spec §12 "win chime (tier-specific pitch)".
     */
    winForTier(tier: 'T1' | 'T2' | 'T3' | 'JACKPOT'): void {
      gate(() => {
        switch (tier) {
          case 'T1':
            playSequence([
              { freq: 523.25, dur: 0.12, gain: 0.15, type: 'triangle' },
              { freq: 659.25, dur: 0.18, gain: 0.15, type: 'triangle' },
            ]);
            break;
          case 'T2':
            playSequence([
              { freq: 523.25, dur: 0.1, gain: 0.18, type: 'triangle' },
              { freq: 659.25, dur: 0.1, gain: 0.18, type: 'triangle' },
              { freq: 783.99, dur: 0.2, gain: 0.18, type: 'triangle' },
            ]);
            break;
          case 'T3':
            playSequence([
              { freq: 523.25, dur: 0.1, gain: 0.2, type: 'triangle' },
              { freq: 659.25, dur: 0.1, gain: 0.2, type: 'triangle' },
              { freq: 783.99, dur: 0.1, gain: 0.2, type: 'triangle' },
              { freq: 1046.5, dur: 0.28, gain: 0.2, type: 'triangle' },
            ]);
            break;
          case 'JACKPOT':
            // Gold fanfare — see goldFanfare below.
            this.goldFanfare();
            break;
        }
      });
    },
    /** Near-miss "almost" — deflating descending minor. */
    nearMiss(): void {
      gate(() =>
        playTone({
          freq: 440,
          dur: 0.35,
          gain: 0.15,
          type: 'sine',
          glideTo: 330,
        }),
      );
    },
    /**
     * Gold fanfare — brighter, longer, clear arpeggio.
     * Used for gold-clip-instant-T3 and JACKPOT celebration moments.
     */
    goldFanfare(): void {
      gate(() =>
        playSequence([
          { freq: 523.25, dur: 0.08, gain: 0.22, type: 'triangle' },
          { freq: 659.25, dur: 0.08, gain: 0.22, type: 'triangle' },
          { freq: 783.99, dur: 0.08, gain: 0.22, type: 'triangle' },
          { freq: 1046.5, dur: 0.1, gain: 0.22, type: 'triangle' },
          { freq: 1318.5, dur: 0.32, gain: 0.22, type: 'triangle' },
        ]),
      );
    },
    /** Timer nudge at 10s / 5s remaining. */
    timerTick(): void {
      gate(() =>
        playTone({ freq: 660, dur: 0.12, gain: 0.18, type: 'sine' }),
      );
    },
  };
}

export type Sfx = {
  spinTick(): void;
  winForTier(tier: 'T1' | 'T2' | 'T3' | 'JACKPOT'): void;
  nearMiss(): void;
  goldFanfare(): void;
  timerTick(): void;
};

/**
 * Default sfx instance — reads from the store's `settings.sfxEnabled` each
 * call. Bind the actual getter at wire-up (3E will call `createSfx`).
 */
export const noopSfx: Sfx = {
  spinTick() {
    /* noop */
  },
  winForTier() {
    /* noop */
  },
  nearMiss() {
    /* noop */
  },
  goldFanfare() {
    /* noop */
  },
  timerTick() {
    /* noop */
  },
};
