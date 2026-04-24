/**
 * Single source of truth for live device telemetry. Calls useGPS and
 * useConnectivity exactly once, then pushes the readings into useBoatStore.
 *
 * Call this in App.tsx (or the root screen). Every other component reads
 * from useBoatStore — this avoids mounting two GPS watchers or two network
 * pollers, which waste battery and can conflict with the permission flow.
 */

import { useEffect } from 'react';

import { useBoatStore } from '../stores/useBoatStore';
import { useConnectivity } from './useConnectivity';
import { useGPS } from './useGPS';

export function useLiveTelemetry() {
  const gps = useGPS();
  const connectivity = useConnectivity();

  const setNavigation = useBoatStore((state) => state.setNavigation);
  const setConnectivity = useBoatStore((state) => state.setConnectivity);
  const setPermissionStatus = useBoatStore((state) => state.setPermissionStatus);
  const setGPSError = useBoatStore((state) => state.setGPSError);

  useEffect(() => {
    setNavigation({
      position: gps.position,
      sog: gps.sog,
      cog: gps.cog,
      heading: gps.heading,
      accuracy: gps.accuracy,
      lastUpdate: gps.lastUpdate,
    });
  }, [gps.position, gps.sog, gps.cog, gps.heading, gps.accuracy, gps.lastUpdate, setNavigation]);

  useEffect(() => {
    setPermissionStatus(gps.permissionStatus);
  }, [gps.permissionStatus, setPermissionStatus]);

  useEffect(() => {
    setGPSError(gps.error);
  }, [gps.error, setGPSError]);

  useEffect(() => {
    setConnectivity(connectivity);
  }, [connectivity, setConnectivity]);
}
