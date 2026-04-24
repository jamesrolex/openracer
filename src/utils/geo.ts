/**
 * Great-circle geometry on a spherical Earth. Good to ~0.5% — more than
 * enough for racing tactics. Use a proper ellipsoidal library if sub-metre
 * precision is ever required (it isn't, here).
 *
 * All inputs/outputs in SignalK-native units: decimal degrees for coords,
 * degrees true (0-360) for bearings, metres for distances.
 *
 * Handles antimeridian crossings naturally via trig; see tests.
 */

import type { DegreesTrue, GeoPosition, Metres } from '../types/signalk';

/** Mean Earth radius (IUGG), metres. */
export const EARTH_RADIUS_METRES = 6371008.8;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/** Normalise a bearing to [0, 360). */
const normaliseBearing = (deg: number): number => ((deg % 360) + 360) % 360;

/** Normalise a longitude to (-180, 180]. */
const normaliseLongitude = (deg: number): number => {
  const wrapped = ((deg + 540) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
};

/**
 * Great-circle distance between two positions, metres. Haversine formula.
 * Returns 0 when points coincide.
 */
export function distanceBetween(from: GeoPosition, to: GeoPosition): Metres {
  const phi1 = toRadians(from.latitude);
  const phi2 = toRadians(to.latitude);
  const deltaPhi = toRadians(to.latitude - from.latitude);
  const deltaLambda = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METRES * c;
}

/**
 * Initial bearing on the great-circle path from `from` to `to`, degrees true,
 * normalised to [0, 360). When the two positions are identical returns 0.
 */
export function bearingBetween(from: GeoPosition, to: GeoPosition): DegreesTrue {
  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return 0;
  }
  const phi1 = toRadians(from.latitude);
  const phi2 = toRadians(to.latitude);
  const deltaLambda = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return normaliseBearing(toDegrees(theta));
}

/**
 * Compute the destination point when travelling `distance` metres along a
 * great-circle on initial bearing `bearing` (degrees true) from `from`.
 *
 * Wraps longitude across the antimeridian naturally. Distances above half
 * Earth's circumference are mathematically valid but seldom useful.
 */
export function destinationPoint(
  from: GeoPosition,
  bearing: DegreesTrue,
  distance: Metres,
): GeoPosition {
  const angularDistance = distance / EARTH_RADIUS_METRES;
  const theta = toRadians(bearing);
  const phi1 = toRadians(from.latitude);
  const lambda1 = toRadians(from.longitude);

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(angularDistance) +
      Math.cos(phi1) * Math.sin(angularDistance) * Math.cos(theta),
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(angularDistance) * Math.cos(phi1),
      Math.cos(angularDistance) - Math.sin(phi1) * Math.sin(phi2),
    );

  return {
    latitude: toDegrees(phi2),
    longitude: normaliseLongitude(toDegrees(lambda2)),
  };
}
