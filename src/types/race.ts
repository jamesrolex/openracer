import type { IsoTimestamp } from './signalk';

/**
 * Where the start sequence is. Time-anchored (see useRaceStore in week 7):
 * all state is derived from `sequenceStartTime` plus a monotonic clock, so
 * killing and reopening the app resumes correctly.
 */
export type RaceState =
  | 'idle'
  | 'armed'
  | 'counting-down'
  | 'starting'
  | 'running'
  | 'finished'
  | 'abandoned';

/**
 * Standard sailing start sequence in seconds before the gun.
 *
 * The defaults match the most common club sequence (5/4/1/0 — Rule 26, ISAF).
 * Exposed as a type so week 7 can add alternative sequences (3-minute dinghy
 * starts, for example) without a type-shape change.
 */
export interface StartSequence {
  /** Warning signal — class flag up. */
  warningAtMs: number;
  /** Preparatory signal — P flag. */
  preparatoryAtMs: number;
  /** One-minute signal. */
  oneMinuteAtMs: number;
  /** Start (warning signal down). Always 0. */
  startAtMs: 0;
}

/** Standard 5/4/1/0 sequence. All values are negative seconds (pre-start). */
export const STANDARD_START_SEQUENCE: StartSequence = {
  warningAtMs: -5 * 60_000,
  preparatoryAtMs: -4 * 60_000,
  oneMinuteAtMs: -1 * 60_000,
  startAtMs: 0,
};

export interface RaceTimerState {
  state: RaceState;
  /** ISO 8601 UTC. When the sequence was armed / the start gun is scheduled.
   *  The start gun (T=0) is exactly this timestamp. Countdown derives from
   *  it, not from a tick counter. Null while `idle`. */
  sequenceStartTime: IsoTimestamp | null;
  /** The sequence configuration in effect. Lets us support non-standard
   *  start sequences later without schema churn. */
  sequence: StartSequence;
  /** When the user hit "General recall" most recently. Informational. */
  lastRecallAt: IsoTimestamp | null;
}

/**
 * A race session row — one per race we've timed. Populated when the timer
 * arms, updated as the race progresses. Phase 1 stores the shell; Phase 2
 * starts logging the track against it.
 */
export interface RaceSession {
  id: string;
  /** The course raced. Null if the timer was armed without a course. */
  courseId: string | null;
  startedAt: IsoTimestamp;
  finishedAt: IsoTimestamp | null;
  state: RaceState;
}
