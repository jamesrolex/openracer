/**
 * useCompass — live true-heading from expo-location.
 *
 * iOS returns a `trueHeading` when the device has been calibrated
 * (brief figure-8 gesture); Android computes it from sensor fusion.
 * If trueHeading < 0 (uncalibrated on iOS) we surface the magnetic
 * heading and flag `needsCalibration`.
 *
 * The phone is assumed to be held pointing away from the sailor —
 * bearing equals the direction the top edge is facing (landscape or
 * portrait, the heading API abstracts that).
 */

import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

export interface CompassReading {
  /** Degrees true, 0-360, null until first reading. */
  trueHeading: number | null;
  /** Degrees magnetic, 0-360, null until first reading. */
  magneticHeading: number | null;
  /**
   * Rough accuracy bucket from the OS: higher = less trustworthy.
   * iOS: 0 (good) → 3 (no calibration). Android's own scale ≈ similar.
   */
  accuracy: number | null;
  needsCalibration: boolean;
  error: string | null;
}

export function useCompass(enabled: boolean = true): CompassReading {
  const [reading, setReading] = useState<CompassReading>({
    trueHeading: null,
    magneticHeading: null,
    accuracy: null,
    needsCalibration: false,
    error: null,
  });
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          setReading((r) => ({ ...r, error: 'Location permission denied' }));
          return;
        }
        const sub = await Location.watchHeadingAsync((heading) => {
          if (cancelled) return;
          const trueValid =
            typeof heading.trueHeading === 'number' && heading.trueHeading >= 0;
          setReading({
            trueHeading: trueValid ? heading.trueHeading : heading.magHeading,
            magneticHeading: heading.magHeading,
            accuracy: heading.accuracy,
            needsCalibration: !trueValid,
            error: null,
          });
        });
        if (cancelled) {
          sub.remove();
          return;
        }
        subscriptionRef.current = sub;
      } catch (err) {
        setReading((r) => ({
          ...r,
          error: err instanceof Error ? err.message : 'Compass failed',
        }));
      }
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [enabled]);

  return reading;
}
