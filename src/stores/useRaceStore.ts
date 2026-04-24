/**
 * Race-timer store. Holds `sequenceStartTime` (ISO) + which course is
 * armed; everything observable is derived from those via
 * `src/domain/raceTimer.ts`. Persisted so a kill-and-reopen during
 * countdown resumes identically.
 *
 * Also owns the current `activeSessionId` — a row in race_sessions
 * that exists from arm-time until reset/abandon. The track logger
 * reads this id to know where to write GPS fixes.
 *
 * No interval ticking here — the screen drives its own rAF loop and
 * reads `makeSnapshot(sequenceStartTime, now)` each frame.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { RaceState, StartSequence } from '../types/race';
import { STANDARD_START_SEQUENCE } from '../types/race';
import { syncToNextWholeMinute } from '../domain/raceTimer';

import {
  createRaceSession,
  updateRaceSessionState,
} from './raceSessionsRepo';
import { sqliteStorage } from './sqliteStorage';

export interface RaceStoreState {
  /** ISO 8601 UTC — the scheduled gun. Null = timer idle. */
  sequenceStartTime: string | null;
  /** Which course this arming is for; null = timer armed without a course. */
  armedCourseId: string | null;
  /** Row id in race_sessions for the current arming, null when idle. */
  activeSessionId: string | null;
  /** Sequence in effect for this arming. */
  sequence: StartSequence;
  /** General-recall count for analytics / UX. */
  recallCount: number;
  /** Running total of metres logged to this session's track — cheap to read
   *  every frame for a live progress readout without hitting SQLite. */
  sailedMetres: number;
  /** Last position logged by the track logger; folded into sailedMetres
   *  on the next write. Null when idle or fresh. */
  lastTrackLatitude: number | null;
  lastTrackLongitude: number | null;
}

export interface RaceActions {
  /** Arm for a start at `gunAt` (rounded to the next whole minute). */
  arm: (gunAt: Date, courseId: string | null) => Promise<string>;
  /** Sync: round the current armed start to the next whole minute. */
  syncToMinute: () => void;
  /** Shift the armed start by ±N minutes. */
  shiftMinutes: (deltaMinutes: number) => void;
  /** General recall: restart the sequence at now+5 min. */
  generalRecall: () => void;
  /** Abandon the race. Marks session `abandoned`, clears timer. */
  abandon: () => Promise<void>;
  /** Finish cleanly (race completed). Marks session `finished`, clears. */
  finish: () => Promise<void>;
  /** Clear the timer without writing a final state (edge cases / tests). */
  reset: () => void;
  /** Set the runtime state tag on the active session (starting / running). */
  setActiveSessionState: (state: RaceState) => Promise<void>;
  /** Fold a freshly-logged track point into the running sailed-distance. */
  addTrackDistance: (latitude: number, longitude: number) => void;
}

const initial: RaceStoreState = {
  sequenceStartTime: null,
  armedCourseId: null,
  activeSessionId: null,
  sequence: STANDARD_START_SEQUENCE,
  recallCount: 0,
  sailedMetres: 0,
  lastTrackLatitude: null,
  lastTrackLongitude: null,
};

// Haversine great-circle distance, inlined here to avoid pulling a
// utils barrel import into a persisted store module (circular-import risk).
function haversineMetres(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const R = 6371008.8;
  const toRad = Math.PI / 180;
  const dLat = (toLat - fromLat) * toRad;
  const dLon = (toLon - fromLon) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat * toRad) *
      Math.cos(toLat * toRad) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const useRaceStore = create<RaceStoreState & RaceActions>()(
  persist(
    (set, get) => ({
      ...initial,

      arm: async (gunAt, courseId) => {
        const start = syncToNextWholeMinute(gunAt);
        const session = await createRaceSession(courseId, start);
        set({
          sequenceStartTime: start.toISOString(),
          armedCourseId: courseId,
          activeSessionId: session.id,
          recallCount: 0,
          sequence: STANDARD_START_SEQUENCE,
          sailedMetres: 0,
          lastTrackLatitude: null,
          lastTrackLongitude: null,
        });
        return session.id;
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
        const newGun = syncToNextWholeMinute(new Date(Date.now() + 5 * 60_000));
        set((s) => ({
          sequenceStartTime: newGun.toISOString(),
          recallCount: s.recallCount + 1,
        }));
      },

      abandon: async () => {
        const id = get().activeSessionId;
        if (id) await updateRaceSessionState(id, 'abandoned', new Date());
        set({ ...initial });
      },

      finish: async () => {
        const id = get().activeSessionId;
        if (id) await updateRaceSessionState(id, 'finished', new Date());
        set({ ...initial });
      },

      reset: () => set({ ...initial }),

      setActiveSessionState: async (state) => {
        const id = get().activeSessionId;
        if (!id) return;
        await updateRaceSessionState(id, state);
      },

      addTrackDistance: (latitude, longitude) => {
        const s = get();
        if (s.lastTrackLatitude === null || s.lastTrackLongitude === null) {
          set({ lastTrackLatitude: latitude, lastTrackLongitude: longitude });
          return;
        }
        const d = haversineMetres(
          s.lastTrackLatitude,
          s.lastTrackLongitude,
          latitude,
          longitude,
        );
        // Same guardrails as computeTrackDistance — drop jitter and jumps.
        if (d < 2 || d > 500) {
          set({ lastTrackLatitude: latitude, lastTrackLongitude: longitude });
          return;
        }
        set({
          sailedMetres: s.sailedMetres + d,
          lastTrackLatitude: latitude,
          lastTrackLongitude: longitude,
        });
      },
    }),
    {
      name: 'openracer.race-timer',
      storage: sqliteStorage<RaceStoreState>(),
      partialize: (state): RaceStoreState => ({
        sequenceStartTime: state.sequenceStartTime,
        armedCourseId: state.armedCourseId,
        activeSessionId: state.activeSessionId,
        sequence: state.sequence,
        recallCount: state.recallCount,
        sailedMetres: state.sailedMetres,
        lastTrackLatitude: state.lastTrackLatitude,
        lastTrackLongitude: state.lastTrackLongitude,
      }),
    },
  ),
);
