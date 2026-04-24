/**
 * User preferences — persisted via SQLite. Defaults match the locked
 * decisions in docs/decisions.md: metric, knots, nautical miles, en-GB.
 *
 * Storage is best-effort (see sqliteStorage) so first-launch hydration can
 * fail silently and we simply render with defaults.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DistanceUnit, LatLonFormat } from '../utils/format';
import { sqliteStorage } from './sqliteStorage';

export type SpeedUnit = 'kn' | 'mph' | 'kmh';

export interface SettingsState {
  /** Marine-standard knots by default. Metric-kmh and statute-mph available. */
  speedUnit: SpeedUnit;
  /** Nautical-mile default for racing; km/m alternatives for cruising. */
  distanceUnit: DistanceUnit;
  /** DMM is the marine display default (see marine-domain skill). */
  coordFormat: LatLonFormat;
  /** Manual toggle. Phase 0 has no auto-enable at sunset — that comes later. */
  nightMode: boolean;
  /** Locale for user-facing copy. Only en-GB is populated for Phase 0. */
  language: 'en-GB';
}

export interface SettingsActions {
  setSpeedUnit: (unit: SpeedUnit) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setCoordFormat: (format: LatLonFormat) => void;
  setNightMode: (on: boolean) => void;
}

const defaults: SettingsState = {
  speedUnit: 'kn',
  distanceUnit: 'nm',
  coordFormat: 'dmm',
  nightMode: false,
  language: 'en-GB',
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...defaults,
      setSpeedUnit: (speedUnit) => set({ speedUnit }),
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setCoordFormat: (coordFormat) => set({ coordFormat }),
      setNightMode: (nightMode) => set({ nightMode }),
    }),
    {
      name: 'openracer.settings',
      storage: sqliteStorage<SettingsState>(),
      partialize: (state): SettingsState => ({
        speedUnit: state.speedUnit,
        distanceUnit: state.distanceUnit,
        coordFormat: state.coordFormat,
        nightMode: state.nightMode,
        language: state.language,
      }),
    },
  ),
);
