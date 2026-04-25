/**
 * Voice race-officer cues — Phase 1.12.
 *
 * The helm shouldn't have to look at the phone during the start sequence.
 * Eyes on the line, eyes on the boat, eyes on the gun. Audio cues fill
 * the gap: short spoken phrases at every minute mark, then a tighter
 * cadence inside the last 30 seconds.
 *
 * Pure JS — uses expo-speech (in standard Expo Go SDK 54), no audio
 * assets to bundle, fully offline. The OS provides TTS.
 *
 * Cadence:
 *   T-5:00       "Five minutes"
 *   T-4:00       "Four minutes"
 *   T-3:00       "Three minutes"
 *   T-2:00       "Two minutes"
 *   T-1:00       "One minute"
 *   T-0:30       "Thirty seconds"
 *   T-0:20       "Twenty"
 *   T-0:10       "Ten"
 *   T-0:05..00   "Five, four, three, two, one, gun!"
 *
 * This module exposes:
 *   - `cuesFor(secondsToStart)` — pure function returning the cue (if any)
 *     for a given integer second. The caller invokes a tracker each tick.
 *   - `speak(phrase)` — wraps expo-speech.speak with sane defaults
 *
 * The tracker (in the React layer) keeps a ref of the last fired second
 * so each cue speaks once even though the timer ticks 4× per second.
 */

import * as Speech from 'expo-speech';

export interface Cue {
  /** Integer second in countdown space (positive = before start). */
  atSecond: number;
  /** Phrase to speak. */
  phrase: string;
  /** Higher = more important; we deduplicate against the last-spoken
   *  cue so the tail-of-countdown cluster doesn't stomp on a slower
   *  earlier cue still finishing. */
  priority: number;
}

const MINUTE_CUES: Cue[] = [
  { atSecond: 300, phrase: 'Five minutes',  priority: 1 },
  { atSecond: 240, phrase: 'Four minutes',  priority: 1 },
  { atSecond: 180, phrase: 'Three minutes', priority: 1 },
  { atSecond: 120, phrase: 'Two minutes',   priority: 1 },
  { atSecond:  60, phrase: 'One minute',    priority: 1 },
];

const TENS_CUES: Cue[] = [
  { atSecond: 30, phrase: 'Thirty seconds', priority: 2 },
  { atSecond: 20, phrase: 'Twenty',          priority: 2 },
  { atSecond: 10, phrase: 'Ten',             priority: 2 },
];

const FINAL_CUES: Cue[] = [
  { atSecond: 5, phrase: 'Five',  priority: 3 },
  { atSecond: 4, phrase: 'Four',  priority: 3 },
  { atSecond: 3, phrase: 'Three', priority: 3 },
  { atSecond: 2, phrase: 'Two',   priority: 3 },
  { atSecond: 1, phrase: 'One',   priority: 3 },
  { atSecond: 0, phrase: 'Gun!',  priority: 4 },
];

const ALL_CUES: Cue[] = [...MINUTE_CUES, ...TENS_CUES, ...FINAL_CUES];

/**
 * Pure: return the cue (if any) for a given integer countdown second.
 * Returns `null` outside the cued range.
 *
 * Caller is responsible for not firing the same cue twice — keep a ref
 * of the last fired `atSecond` and skip if it matches.
 */
export function cueFor(integerSecondToStart: number): Cue | null {
  return ALL_CUES.find((c) => c.atSecond === integerSecondToStart) ?? null;
}

export const allCues: readonly Cue[] = ALL_CUES;

/**
 * Speak the phrase. Defaults: en-GB voice, slightly faster than default
 * so a 5-second cluster lands under a second per word.
 */
export function speakCue(phrase: string): void {
  // Best-effort. expo-speech swallows errors silently if no TTS engine
  // is available; we don't want a missing voice to break the timer.
  try {
    Speech.speak(phrase, {
      language: 'en-GB',
      rate: 1.05,
      pitch: 1.0,
    });
  } catch {
    // no-op — voice is non-critical
  }
}

/** Stop any in-flight speech; called when the timer abandons / postpones. */
export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // no-op
  }
}
