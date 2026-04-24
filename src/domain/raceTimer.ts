/**
 * Race-timer state machine — pure, time-anchored.
 *
 * A single canonical input (`sequenceStartTime`, the ISO time of the
 * scheduled gun) plus `now` is enough to derive every observable:
 *  - state (idle | armed | counting-down | starting | running | finished)
 *  - millisecondsToStart (negative post-start)
 *  - the most recent and next sequence signal
 *  - band colour for the countdown display
 *
 * Everything stays in memory — no ticks, no intervals. The screen
 * re-renders via an rAF loop and asks this module for the current
 * snapshot. Killing the app and reopening returns identical output
 * because `sequenceStartTime` persists via SQLite.
 */

import type { RaceState, StartSequence } from '../types/race';
import { STANDARD_START_SEQUENCE } from '../types/race';

/** Observable signal that just fired (or is about to fire). */
export type SequenceSignal = 'warning' | 'preparatory' | 'one-minute' | 'start';

export interface TimerSnapshot {
  state: RaceState;
  /** Positive before the gun, zero at gun, negative after. */
  millisecondsToStart: number;
  /** Seconds to start, rounded to the nearest whole second. */
  secondsToStart: number;
  /** The most recent signal that has fired, or null if none yet. */
  lastSignal: SequenceSignal | null;
  /** The next signal due, or null if the sequence is over. */
  nextSignal: SequenceSignal | null;
  /** Milliseconds until the next signal — positive, or null. */
  millisecondsToNextSignal: number | null;
  /** Display band — drives the countdown colour. */
  band: 'dormant' | 'preparing' | 'urgent' | 'live' | 'after';
}

/** Time after the gun at which we auto-transition from `starting` to `running`. */
const STARTING_WINDOW_MS = 3000;
/** Running state caps after this long (safety for people who forget to finish). */
const RUNNING_CAP_MS = 6 * 60 * 60 * 1000;

export function makeSnapshot(
  sequenceStartTime: string | null,
  now: Date,
  sequence: StartSequence = STANDARD_START_SEQUENCE,
): TimerSnapshot {
  if (sequenceStartTime === null) {
    return {
      state: 'idle',
      millisecondsToStart: 0,
      secondsToStart: 0,
      lastSignal: null,
      nextSignal: null,
      millisecondsToNextSignal: null,
      band: 'dormant',
    };
  }

  const startMs = new Date(sequenceStartTime).getTime();
  const diff = startMs - now.getTime();

  const signalOffsets: { signal: SequenceSignal; atMs: number }[] = [
    { signal: 'warning', atMs: sequence.warningAtMs },
    { signal: 'preparatory', atMs: sequence.preparatoryAtMs },
    { signal: 'one-minute', atMs: sequence.oneMinuteAtMs },
    { signal: 'start', atMs: sequence.startAtMs },
  ];

  // "Time since start of sequence" — negative if we haven't hit warning yet.
  const offsetFromStart = -diff;
  let lastSignal: SequenceSignal | null = null;
  let nextSignal: SequenceSignal | null = null;
  let msToNextSignal: number | null = null;
  for (const { signal, atMs } of signalOffsets) {
    if (offsetFromStart >= atMs) {
      lastSignal = signal;
    } else if (nextSignal === null) {
      nextSignal = signal;
      msToNextSignal = atMs - offsetFromStart;
    }
  }

  // State derivation.
  let state: RaceState;
  let band: TimerSnapshot['band'];
  if (offsetFromStart < sequence.warningAtMs) {
    // Armed but the warning signal hasn't fired yet.
    state = 'armed';
    band = 'dormant';
  } else if (diff > 60_000) {
    state = 'counting-down';
    band = 'preparing';
  } else if (diff > 0) {
    state = 'counting-down';
    band = 'urgent';
  } else if (diff > -STARTING_WINDOW_MS) {
    state = 'starting';
    band = 'live';
  } else if (-diff < RUNNING_CAP_MS) {
    state = 'running';
    band = 'after';
  } else {
    state = 'finished';
    band = 'after';
  }

  return {
    state,
    millisecondsToStart: diff,
    secondsToStart: Math.round(diff / 1000),
    lastSignal,
    nextSignal,
    millisecondsToNextSignal: msToNextSignal,
    band,
  };
}

/**
 * Round `armTime` to the next whole minute — the classic racer's sync
 * move ("match my watch to the deck") since course papers often give
 * minute-granular start times.
 */
export function syncToNextWholeMinute(armTime: Date): Date {
  const ms = armTime.getTime();
  const rounded = Math.ceil(ms / 60_000) * 60_000;
  return new Date(rounded);
}

/** Format seconds-to-start as a display string — "T-04:32" / "T+01:07". */
export function formatCountdown(seconds: number): string {
  const sign = seconds >= 0 ? '-' : '+';
  const abs = Math.abs(seconds);
  const mm = Math.floor(abs / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(abs % 60)
    .toString()
    .padStart(2, '0');
  return `T${sign}${mm}:${ss}`;
}
