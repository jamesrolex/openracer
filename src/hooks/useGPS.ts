/**
 * Live GPS feed. Wraps expo-location. Returns SignalK-native values (m/s for
 * speed, degrees true for heading and course, metres for accuracy).
 *
 * Permission denial is handled gracefully — the hook never throws. Callers
 * read `permissionStatus` to branch UI (e.g. show a "grant access" prompt).
 *
 * Update rate: 1 Hz. Background location is not requested in Phase 0 even
 * though the Info.plist advertises it — that comes later with the race timer.
 */

import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import type { NavigationState } from '../types/signalk';

export type GPSPermissionStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

export interface UseGPSResult extends NavigationState {
  permissionStatus: GPSPermissionStatus;
  /** Human-readable error if acquiring the GPS failed for a non-permission reason. */
  error: string | null;
}

const EMPTY_STATE: NavigationState = {
  position: null,
  sog: null,
  cog: null,
  heading: null,
  accuracy: null,
  lastUpdate: null,
};

export function useGPS(): UseGPSResult {
  const [state, setState] = useState<NavigationState>(EMPTY_STATE);
  const [permissionStatus, setPermissionStatus] = useState<GPSPermissionStatus>('unknown');
  const [error, setError] = useState<string | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const existing = await Location.getForegroundPermissionsAsync();
        let status = existing.status;
        if (status !== 'granted') {
          const requested = await Location.requestForegroundPermissionsAsync();
          status = requested.status;
        }

        if (cancelled) return;

        if (status !== 'granted') {
          setPermissionStatus(status === 'denied' ? 'denied' : 'undetermined');
          return;
        }

        setPermissionStatus('granted');

        watcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          (reading) => {
            if (cancelled) return;
            setState({
              position: {
                latitude: reading.coords.latitude,
                longitude: reading.coords.longitude,
              },
              sog: reading.coords.speed ?? null,
              cog: reading.coords.heading ?? null,
              heading: reading.coords.heading ?? null,
              accuracy: reading.coords.accuracy ?? null,
              lastUpdate: new Date(reading.timestamp).toISOString(),
            });
            setError(null);
          },
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown GPS error');
      }
    }

    start();

    return () => {
      cancelled = true;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, []);

  return { ...state, permissionStatus, error };
}
