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
  /** Display theme. 'kindle' is the high-contrast B/W variant designed
   *  for sunlight readability + e-ink portability. Takes precedence over
   *  `nightMode` when set to 'night' or 'kindle'. */
  theme: 'day' | 'night' | 'kindle';
  /** Helm Display Mode — strips controls on the race timer to a
   *  glance-only kiosk view. Survives app restart. Toggle on
   *  RaceTimerScreen via tap-and-hold gesture. */
  helmDisplayMode: boolean;
  /** Locale for user-facing copy. Only en-GB is populated for Phase 0. */
  language: 'en-GB';
  /** First-launch onboarding gate — false until the sailor taps "Get started". */
  onboardingCompleted: boolean;
  /** Manual true-wind direction in degrees true (0-360). Sailors without
   *  instruments enter this once before a start; it powers the favoured-end
   *  chip on the start-line readout. Null = unknown, chip is hidden. */
  manualTrueWindDegrees: number | null;
  /** Manual true-wind speed in knots. Null = unknown. Powers the polar
   *  target-boatspeed lookup. */
  manualTrueWindKn: number | null;
  /** Raw polar table text (ORC-style grid). Null = no polar set; target-
   *  boatspeed readout hidden. */
  polarRaw: string | null;
  /** Persistent boat name — set once, used everywhere a captain shares
   *  their boat. Null until the sailor enters it. */
  boatName: string | null;
  /** Last-shown dashboard id while a race timer was armed. Used to open
   *  the catalogue back on the same view. Null falls back to the first
   *  race-mode dashboard. Phase 1.8. */
  lastRaceDashboardId: string | null;
  /** Last-shown dashboard id while no race was armed. Phase 1.8. */
  lastCruiseDashboardId: string | null;
}

export interface SettingsActions {
  setSpeedUnit: (unit: SpeedUnit) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setCoordFormat: (format: LatLonFormat) => void;
  setNightMode: (on: boolean) => void;
  setTheme: (theme: 'day' | 'night' | 'kindle') => void;
  setHelmDisplayMode: (on: boolean) => void;
  completeOnboarding: () => void;
  setManualTrueWindDegrees: (deg: number | null) => void;
  setManualTrueWindKn: (kn: number | null) => void;
  setPolarRaw: (raw: string | null) => void;
  setBoatName: (name: string | null) => void;
  setLastRaceDashboardId: (id: string | null) => void;
  setLastCruiseDashboardId: (id: string | null) => void;
}

const defaults: SettingsState = {
  speedUnit: 'kn',
  distanceUnit: 'nm',
  coordFormat: 'dmm',
  nightMode: false,
  theme: 'day',
  helmDisplayMode: false,
  language: 'en-GB',
  onboardingCompleted: false,
  manualTrueWindDegrees: null,
  manualTrueWindKn: null,
  polarRaw: null,
  boatName: null,
  lastRaceDashboardId: null,
  lastCruiseDashboardId: null,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...defaults,
      setSpeedUnit: (speedUnit) => set({ speedUnit }),
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setCoordFormat: (coordFormat) => set({ coordFormat }),
      setNightMode: (nightMode) =>
        // Keep `theme` in sync with the legacy boolean so existing call-
        // sites that read `nightMode` continue to work. Selecting day or
        // night via the theme picker also updates this flag.
        set({ nightMode, theme: nightMode ? 'night' : 'day' }),
      setTheme: (theme) =>
        set({ theme, nightMode: theme === 'night' }),
      setHelmDisplayMode: (helmDisplayMode) => set({ helmDisplayMode }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      setManualTrueWindDegrees: (manualTrueWindDegrees) =>
        set({ manualTrueWindDegrees }),
      setManualTrueWindKn: (manualTrueWindKn) => set({ manualTrueWindKn }),
      setPolarRaw: (polarRaw) => set({ polarRaw }),
      setBoatName: (boatName) => set({ boatName }),
      setLastRaceDashboardId: (lastRaceDashboardId) => set({ lastRaceDashboardId }),
      setLastCruiseDashboardId: (lastCruiseDashboardId) => set({ lastCruiseDashboardId }),
    }),
    {
      name: 'openracer.settings',
      storage: sqliteStorage<SettingsState>(),
      partialize: (state): SettingsState => ({
        speedUnit: state.speedUnit,
        distanceUnit: state.distanceUnit,
        coordFormat: state.coordFormat,
        nightMode: state.nightMode,
        theme: state.theme,
        helmDisplayMode: state.helmDisplayMode,
        language: state.language,
        onboardingCompleted: state.onboardingCompleted,
        manualTrueWindDegrees: state.manualTrueWindDegrees,
        manualTrueWindKn: state.manualTrueWindKn,
        polarRaw: state.polarRaw,
        boatName: state.boatName,
        lastRaceDashboardId: state.lastRaceDashboardId,
        lastCruiseDashboardId: state.lastCruiseDashboardId,
      }),
    },
  ),
);
