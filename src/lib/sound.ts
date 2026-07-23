/**
 * Tiny synthesised sound effects.
 *
 * Everything is generated with the Web Audio API rather than shipped as audio
 * files: no assets to cache, works offline, and nothing to license. Every
 * entry point is failure-tolerant — if the browser blocks or lacks audio the
 * app simply stays silent.
 *
 * One shared on/off setting covers the whole app; the toggle lives on the
 * rewards page.
 */

const SOUND_KEY = 'lukumaku.sound.v1';

/** Sound is on unless the user turned it off. */
export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable — the toggle just won't persist */
  }
}

let ctx: AudioContext | null = null;

/**
 * Lazily create the audio context. Browsers keep it suspended until a user
 * gesture, so this also nudges it to resume; sounds triggered without a
 * gesture (e.g. on page load) are silently dropped, which is intended.
 */
function getContext(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  /** Seconds from now. */
  at?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
}

/** One note with a quick attack and exponential decay. */
function tone({
  freq,
  at = 0,
  duration = 0.18,
  type = 'triangle',
  gain = 0.18,
}: ToneOptions): void {
  const audio = getContext();
  if (!audio) return;

  const start = audio.currentTime + at;
  const osc = audio.createOscillator();
  const env = audio.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(env).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/**
 * Major pentatonic — any combination of these sounds consonant, so a cascade
 * of candies never turns into noise however they land.
 */
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0];

/** A sweet landing in the jar. Pitch varies so a run sounds like a melody. */
export function playCandyDrop(index = 0): void {
  if (!soundEnabled()) return;
  const freq = PENTATONIC[index % PENTATONIC.length] * (index >= 5 ? 1.5 : 1);
  tone({ freq, duration: 0.16, type: 'triangle', gain: 0.16 });
  // A touch of high sine on top gives it a glassy "plink".
  tone({ freq: freq * 2, duration: 0.08, type: 'sine', gain: 0.06 });
}

/** Jar filled: a rising major arpeggio finishing on the octave. */
export function playJarComplete(): void {
  if (!soundEnabled()) return;
  const root = 523.25; // C5
  [
    [root, 0],
    [root * 1.25, 0.1],
    [root * 1.5, 0.2],
    [root * 2, 0.3],
  ].forEach(([freq, at]) =>
    tone({ freq, at, duration: 0.5, type: 'triangle', gain: 0.17 })
  );
  // Shimmer on the final note.
  tone({ freq: root * 3, at: 0.3, duration: 0.7, type: 'sine', gain: 0.07 });
}

/** A journal entry was saved: a soft, warm two-note confirmation. */
export function playEntrySaved(): void {
  if (!soundEnabled()) return;
  tone({ freq: 587.33, duration: 0.13, type: 'triangle', gain: 0.14 }); // D5
  tone({ freq: 880.0, at: 0.09, duration: 0.3, type: 'sine', gain: 0.12 }); // A5
}

/** A new badge: a short two-note bell. */
export function playBadgeUnlock(): void {
  if (!soundEnabled()) return;
  tone({ freq: 783.99, duration: 0.22, type: 'sine', gain: 0.16 });
  tone({ freq: 1046.5, at: 0.11, duration: 0.42, type: 'sine', gain: 0.14 });
}
