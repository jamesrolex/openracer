/**
 * useCruiseTrackStore — manages the currently-recording cruise track.
 *
 * Phase 1.16. Pairs with cruiseTrackRepo for persistence; this store
 * just holds the active-track id + the rolling stats so the UI can
 * render "● Recording — 2.4 nm" without re-hitting SQLite each tick.
 *
 * The actual point-write loop lives in `useCruiseTrackLogger` (hook).
 */

import { create } from 'zustand';

import {
  createCruiseTrack,
  endCruiseTrack,
  getActiveCruiseTrack,
  type CruiseTrack,
} from './cruiseTrackRepo';

export interface CruiseTrackUiState {
  activeTrack: CruiseTrack | null;
  /** Updated by the logger hook every fix; mirrors what's in SQLite. */
  liveDistanceMetres: number;
  liveMaxSogMps: number | null;
  livePointCount: number;
  /** Last position the logger committed; used to compute the next delta. */
  lastLatitude: number | null;
  lastLongitude: number | null;
}

export interface CruiseTrackUiActions {
  /** Resume an in-flight track if one was left active across an app
   *  restart. Called once on mount. */
  hydrate: () => Promise<void>;
  start: (name?: string) => Promise<void>;
  stop: () => Promise<void>;
  /** Logger hook calls this on every fix to snapshot progress. */
  noteProgress: (patch: {
    addedDistanceMetres: number;
    sogMps: number | null;
    latitude: number;
    longitude: number;
  }) => void;
}

const initialState: CruiseTrackUiState = {
  activeTrack: null,
  liveDistanceMetres: 0,
  liveMaxSogMps: null,
  livePointCount: 0,
  lastLatitude: null,
  lastLongitude: null,
};

export const useCruiseTrackStore = create<
  CruiseTrackUiState & CruiseTrackUiActions
>((set, get) => ({
  ...initialState,

  hydrate: async () => {
    const existing = await getActiveCruiseTrack();
    if (existing) {
      set({
        activeTrack: existing,
        liveDistanceMetres: existing.distanceMetres,
        liveMaxSogMps: existing.maxSogMps,
        livePointCount: existing.pointCount,
        lastLatitude: null,
        lastLongitude: null,
      });
    }
  },

  start: async (name) => {
    if (get().activeTrack) return;
    const track = await createCruiseTrack(name);
    set({
      activeTrack: track,
      liveDistanceMetres: 0,
      liveMaxSogMps: null,
      livePointCount: 0,
      lastLatitude: null,
      lastLongitude: null,
    });
  },

  stop: async () => {
    const { activeTrack } = get();
    if (!activeTrack) return;
    await endCruiseTrack(activeTrack.id);
    set(initialState);
  },

  noteProgress: ({ addedDistanceMetres, sogMps, latitude, longitude }) => {
    const state = get();
    const nextDistance = state.liveDistanceMetres + addedDistanceMetres;
    const nextMaxSog =
      sogMps !== null &&
      (state.liveMaxSogMps === null || sogMps > state.liveMaxSogMps)
        ? sogMps
        : state.liveMaxSogMps;
    set({
      liveDistanceMetres: nextDistance,
      liveMaxSogMps: nextMaxSog,
      livePointCount: state.livePointCount + 1,
      lastLatitude: latitude,
      lastLongitude: longitude,
    });
  },
}));
