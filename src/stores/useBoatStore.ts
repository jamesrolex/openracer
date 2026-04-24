/**
 * The live boat state. Updated every second by hooks (useGPS, useConnectivity)
 * via the setters below. Components read selectively to avoid re-rendering
 * on unrelated updates.
 *
 * Not persisted — every value is either a real-time sensor reading or
 * session-scoped. Persistence lives in useSettingsStore.
 */

import { create } from 'zustand';

import type { GPSPermissionStatus } from '../hooks/useGPS';
import type { ConnectivityMode } from '../types/connectivity';
import type { AppMode } from '../types/mode';
import type { NavigationState } from '../types/signalk';

export interface BoatState extends NavigationState {
  mode: AppMode;
  connectivity: ConnectivityMode;
  /** Latest GPS permission status reported by the telemetry hook. */
  permissionStatus: GPSPermissionStatus;
  /** Last non-null GPS error message, or null. */
  gpsError: string | null;
}

export interface BoatActions {
  setNavigation: (state: NavigationState) => void;
  setMode: (mode: AppMode) => void;
  setConnectivity: (mode: ConnectivityMode) => void;
  setPermissionStatus: (status: GPSPermissionStatus) => void;
  setGPSError: (error: string | null) => void;
}

const initialState: BoatState = {
  position: null,
  sog: null,
  cog: null,
  heading: null,
  accuracy: null,
  lastUpdate: null,
  mode: 'race',
  connectivity: 'offline',
  permissionStatus: 'unknown',
  gpsError: null,
};

export const useBoatStore = create<BoatState & BoatActions>((set) => ({
  ...initialState,
  setNavigation: (nav) =>
    set((prev) => ({
      ...prev,
      position: nav.position,
      sog: nav.sog,
      cog: nav.cog,
      heading: nav.heading,
      accuracy: nav.accuracy,
      lastUpdate: nav.lastUpdate,
    })),
  setMode: (mode) => set({ mode }),
  setConnectivity: (connectivity) => set({ connectivity }),
  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
  setGPSError: (gpsError) => set({ gpsError }),
}));
