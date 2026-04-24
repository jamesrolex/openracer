/**
 * Race-timer store. Holds `sequenceStartTime` (ISO) + which course is
 * armed; everything observable is derived from those via
 * `src/domain/raceTimer.ts`. Persisted so a kill-and-reopen during
 * countdown resumes identically.
 *
 * No interval ticking here — the screen drives its own rAF loop and
 * reads `makeSnapshot(sequenceStartTime, now)` each frame.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { StartSequence } from '../types/race';
import { STANDARD_START_SEQUENCE } from '../types/race';
import { syncToNextWholeMinute } from '../domain/raceTimer';

import { sqliteStorage } from './sqliteStorage';

export interface RaceState {
  /** ISO 8601 UTC — the scheduled gun. Null = timer idle. */
  sequenceStartTime: string | null;
  /** Which course this arming is for; null = timer armed without a course. */
  armedCourseId: string | null;
  /** Sequence in effect for this arming. */
  sequence: StartSequence;
  /** General-recall count for analytics / UX. */
  recallCount: number;
}

export interface RaceActions {
  /** Arm for a start at `gunAt` (rounded to the next whole minute). */
  arm: (gunAt: Date, courseId: string | null) => void;
  /** Sync: round the current armed start to the next whole minute. */
  syncToMinute: () => void;
  /** Shift the armed start by ±N minutes. */
  shiftMinutes: (deltaMinutes: number) => void;
  /** General recall: restart the sequence at now+5 min. */
  generalRecall: () => void;
  /** Abandon the race. Clears timer. */
  abandon: () => void;
  /** Clear the timer without marking abandon (after race completes). */
  reset: () => void;
}

const initial: RaceState = {
  sequenceStartTime: null,
  armedCourseId: null,
  sequence: STANDARD_START_SEQUENCE,
  recallCount: 0,
};

export const useRaceStore = create<RaceState & RaceActions>()(
  persist(
    (set, get) => ({
      ...initial,

      arm: (gunAt, courseId) => {
        const start = syncToNextWholeMinute(gunAt);
        set({
          sequenceStartTime: start.toISOString(),
          armedCourseId: courseId,
          recallCount: 0,
          sequence: STANDARD_START_SEQUENCE,
        });
      },

      syncToMinute: () => {
        const current = get().sequenceStartTime;
        if (!current) return;
        const rounded = syncToNextWholeMinute(new Date(current));
        set({ sequenceStartTime: rounded.toISOString() });
      },

      shiftMinutes: (deltaMinutes) => {
        const current = get().sequenceStartTime;
        if (!current) return;
        const shifted = new Date(new Date(current).getTime() + deltaMinutes * 60_000);
        set({ sequenceStartTime: shifted.toISOString() });
      },

      generalRecall: () => {
        // Restart the sequence: new gun is five minutes from now, rounded.
        const newGun = syncToNextWholeMinute(new Date(Date.now() + 5 * 60_000));
        set((s) => ({
          sequenceStartTime: newGun.toISOString(),
          recallCount: s.recallCount + 1,
        }));
      },

      abandon: () => set({ ...initial }),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'openracer.race-timer',
      storage: sqliteStorage<RaceState>(),
      partialize: (state): RaceState => ({
        sequenceStartTime: state.sequenceStartTime,
        armedCourseId: state.armedCourseId,
        sequence: state.sequence,
        recallCount: state.recallCount,
      }),
    },
  ),
);
