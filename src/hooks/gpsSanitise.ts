/**
 * Pure sanitiser for raw GPS coords. Kept in its own file so unit tests can
 * import it without dragging expo-location (and its native module stubs)
 * into the Jest worker.
 *
 * See docs/bugs.md B-001 for the iOS-stationary background.
 */

import type { NavigationState } from '../types/signalk';

export interface RawGPSCoords {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
}

/**
 * Normalise a raw GPS reading into a SignalK-shaped NavigationState.
 *
 * iOS CLLocation (and some Android providers) return -1 for `speed` and
 * `course` when the value cannot be measured reliably — typically when the
 * device is stationary. We treat any negative value as "unavailable" and
 * surface it as null, so the UI renders "—" rather than misleading data
 * like "-1.9 kn" or "359°" (B-001).
 */
export function sanitiseGPSReading(coords: RawGPSCoords, timestampMs: number): NavigationState {
  const validSpeed = coords.speed !== null && coords.speed >= 0;
  const validHeading = coords.heading !== null && coords.heading >= 0;
  return {
    position: { latitude: coords.latitude, longitude: coords.longitude },
    sog: validSpeed ? coords.speed : null,
    cog: validHeading ? coords.heading : null,
    heading: validHeading ? coords.heading : null,
    accuracy: coords.accuracy,
    lastUpdate: new Date(timestampMs).toISOString(),
  };
}
