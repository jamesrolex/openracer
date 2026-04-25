/**
 * useTripStore — simple car-odometer style trip counter for cruise mode.
 *
 * Accumulates distance travelled between consecutive GPS fixes. Persisted
 * via sqliteStorage so the trip survives app restart — this matches a
 * cruiser's mental model: "I started the trip at the marina yesterday,
 * I want to see how far I've come."
 *
 * Noise floor (2 m) rejects GPS jitter when moored. Large jumps
 * (>500 m between fixes) are rejected too — that's either a fresh fix
 * after a signal loss or an error, not real motion. Both edges tuned
 * for coastal sailing; dinghy racing barely moves the needle.
 *
 * Race mode uses a separate track in raceSessionsRepo — do not confuse
 * the two. This store is for cruising only.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { GeoPosition } from '../types/signalk';
import { distanceBetween } from '../utils/geo';
import { sqliteStorage } from './sqliteStorage';

const NOISE_FLOOR_M = 2;
const MAX_JUMP_M = 500;

export interface TripState {
  /** ISO timestamp when this trip started, or null if never started. */
  startedAt: string | null;
  /** Accumulated distance in metres. */
  distanceMetres: number;
  /** Last position processed; used to compute the delta. */
  lastLatitude: number | null;
  lastLongitude: number | null;
  /** Max SOG (m/s) seen during the current trip. Resets with the
   *  trip. For lifetime, use `lifetimeMaxSogMps`. */
  maxSogMps: number;
  /** Lifetime cruise distance — never resets. Trip resets fold the
   *  current trip's distance into this counter. Drives the Sailing
   *  Log's "total cruise miles" stat (Phase 1.10). */
  lifetimeCruiseMetres: number;
  /** Lifetime max SOG (m/s) — never resets. */
  lifetimeMaxSogMps: number;
}

export interface TripActions {
  /** Fold a fresh GPS fix into the trip total. Safe to call every 1 Hz. */
  recordPosition: (pos: GeoPosition, sogMps: number | null) => void;
  /** Zero the trip and start a new one now. */
  reset: () => void;
  /** Stop logging to this trip (e.g. when switching to race mode). */
  pause: () => void;
}

const initialState: TripState = {
  startedAt: null,
  distanceMetres: 0,
  lastLatitude: null,
  lastLongitude: null,
  maxSogMps: 0,
  lifetimeCruiseMetres: 0,
  lifetimeMaxSogMps: 0,
};

export const useTripStore = create<TripState & TripActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      recordPosition: (pos, sog) => {
        const state = get();
        const last =
          state.lastLatitude !== null && state.lastLongitude !== null
            ? { latitude: state.lastLatitude, longitude: state.lastLongitude }
            : null;

        // First fix ever — seed start time, position, no distance yet.
        if (state.startedAt === null || last === null) {
          set({
            startedAt: state.startedAt ?? new Date().toISOString(),
            lastLatitude: pos.latitude,
            lastLongitude: pos.longitude,
            maxSogMps: sog !== null && sog > state.maxSogMps ? sog : state.maxSogMps,
            lifetimeMaxSogMps:
              sog !== null && sog > state.lifetimeMaxSogMps
                ? sog
                : state.lifetimeMaxSogMps,
          });
          return;
        }

        const delta = distanceBetween(last, pos);
        if (delta < NOISE_FLOOR_M) {
          // Still update max SOG even if we're sitting still with a spike.
          if (sog !== null && sog > state.maxSogMps) set({ maxSogMps: sog });
          return;
        }
        if (delta > MAX_JUMP_M) {
          // Fresh fix after a signal loss — re-seed, don't count the jump.
          set({ lastLatitude: pos.latitude, lastLongitude: pos.longitude });
          return;
        }

        const nextMax =
          sog !== null && sog > state.maxSogMps ? sog : state.maxSogMps;
        const nextLifetimeMax =
          sog !== null && sog > state.lifetimeMaxSogMps
            ? sog
            : state.lifetimeMaxSogMps;
        set({
          distanceMetres: state.distanceMetres + delta,
          lastLatitude: pos.latitude,
          lastLongitude: pos.longitude,
          maxSogMps: nextMax,
          lifetimeCruiseMetres: state.lifetimeCruiseMetres + delta,
          lifetimeMaxSogMps: nextLifetimeMax,
        });
      },
      reset: () => {
        // Folding rule: when the user resets the trip, the current
        // trip distance is considered "done" — already counted into
        // `lifetimeCruiseMetres` as it accumulated, so we don't add
        // it again here. Just clear the trip-scoped state.
        set({
          startedAt: new Date().toISOString(),
          distanceMetres: 0,
          lastLatitude: null,
          lastLongitude: null,
          maxSogMps: 0,
        });
      },
      pause: () => set({ lastLatitude: null, lastLongitude: null }),
    }),
    {
      name: 'openracer.trip',
      storage: sqliteStorage<TripState>(),
      partialize: (state): TripState => ({
        startedAt: state.startedAt,
        distanceMetres: state.distanceMetres,
        lastLatitude: state.lastLatitude,
        lastLongitude: state.lastLongitude,
        maxSogMps: state.maxSogMps,
        lifetimeCruiseMetres: state.lifetimeCruiseMetres,
        lifetimeMaxSogMps: state.lifetimeMaxSogMps,
      }),
    },
  ),
);
