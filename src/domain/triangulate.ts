/**
 * Triangulation — find a mark's position from two bearings taken from
 * two separated GPS fixes. Pure math, no I/O.
 *
 * Inputs:
 *  - sighting A: (position A, bearing A in degrees true)
 *  - sighting B: (position B, bearing B in degrees true)
 *
 * Output (when bearings cross forward of both observers):
 *  - target position
 *  - accuracyMetres: rough estimate of uncertainty (sqrt of fix
 *    accuracies plus a term proportional to 1/sin(angle between bearings))
 *
 * Limitations:
 *  - bearings that don't cross forward of both observers → not-ahead error
 *  - near-parallel bearings → ill-conditioned, error grows. We reject
 *    anything under 5° between bearings.
 *  - observations assumed to be within ~1 km of each other; we use a
 *    local ENU projection centred on the midpoint.
 */

import type { GeoPosition, Metres } from '../types/signalk';

export type TriangulateError =
  | { kind: 'bearings-parallel'; angleDeg: number }
  | { kind: 'intersection-behind' }
  | { kind: 'positions-identical' };

export type TriangulateResult =
  | { ok: true; target: GeoPosition; accuracyMetres: Metres }
  | { ok: false; error: TriangulateError };

const EARTH_RADIUS_METRES = 6371008.8;

function metresPerDegree(lat: number): { mPerLat: number; mPerLon: number } {
  const latRad = (lat * Math.PI) / 180;
  return {
    mPerLat: (Math.PI / 180) * EARTH_RADIUS_METRES,
    mPerLon: (Math.PI / 180) * EARTH_RADIUS_METRES * Math.cos(latRad),
  };
}

export interface Sighting {
  position: GeoPosition;
  /** Degrees true, 0-360, from observer to target. */
  bearing: number;
  /** Optional — GPS horizontal accuracy at the moment of sighting. */
  fixAccuracyMetres?: number;
  /** Optional — compass uncertainty in degrees (phone magnetometer is
   *  typically ±5° under good conditions, worse near metal). */
  compassAccuracyDegrees?: number;
}

export function triangulate(a: Sighting, b: Sighting): TriangulateResult {
  // Reject identical positions — no parallax, no solution.
  if (a.position.latitude === b.position.latitude && a.position.longitude === b.position.longitude) {
    return { ok: false, error: { kind: 'positions-identical' } };
  }

  // Local ENU centred on the midpoint.
  const midLat = (a.position.latitude + b.position.latitude) / 2;
  const midLon = (a.position.longitude + b.position.longitude) / 2;
  const { mPerLat, mPerLon } = metresPerDegree(midLat);

  const ax = (a.position.longitude - midLon) * mPerLon;
  const ay = (a.position.latitude - midLat) * mPerLat;
  const bx = (b.position.longitude - midLon) * mPerLon;
  const by = (b.position.latitude - midLat) * mPerLat;

  const aRad = (a.bearing * Math.PI) / 180;
  const bRad = (b.bearing * Math.PI) / 180;

  // ENU convention: +x east, +y north. Bearing 0° = north = +y, 90° = east = +x.
  const dAx = Math.sin(aRad);
  const dAy = Math.cos(aRad);
  const dBx = Math.sin(bRad);
  const dBy = Math.cos(bRad);

  // Angle between bearings (smallest).
  const dot = dAx * dBx + dAy * dBy;
  const angleBetween = Math.acos(Math.max(-1, Math.min(1, Math.abs(dot)))) * (180 / Math.PI);
  if (angleBetween < 5) {
    return { ok: false, error: { kind: 'bearings-parallel', angleDeg: angleBetween } };
  }

  // Solve ax + t1*dAx = bx + t2*dBx and ay + t1*dAy = by + t2*dBy.
  const dx = bx - ax;
  const dy = by - ay;
  // Determinant of the 2x2 system [dAx, -dBx; dAy, -dBy].
  const det = -dAx * dBy + dAy * dBx;
  const t1 = (-dx * dBy + dy * dBx) / det;
  const t2 = (-dx * dAy + dy * dAx) / det;

  if (t1 < 0 || t2 < 0) {
    return { ok: false, error: { kind: 'intersection-behind' } };
  }

  const targetX = ax + t1 * dAx;
  const targetY = ay + t1 * dAy;

  const target: GeoPosition = {
    latitude: midLat + targetY / mPerLat,
    longitude: midLon + targetX / mPerLon,
  };

  // Accuracy heuristic: the compass uncertainty at distance t projects to
  // a crossing error ∝ 1/sin(angle). Combine with GPS fix accuracy.
  const compassDeg = Math.max(
    a.compassAccuracyDegrees ?? 5,
    b.compassAccuracyDegrees ?? 5,
  );
  const compassRad = (compassDeg * Math.PI) / 180;
  const avgDist = (t1 + t2) / 2;
  const sinAngle = Math.sin((angleBetween * Math.PI) / 180);
  const bearingCrossError = (compassRad * avgDist) / Math.max(0.1, sinAngle);
  const fixErr = Math.max(a.fixAccuracyMetres ?? 10, b.fixAccuracyMetres ?? 10);
  const accuracyMetres = Math.hypot(bearingCrossError, fixErr);

  return { ok: true, target, accuracyMetres };
}

export function describeTriangulateError(err: TriangulateError): string {
  switch (err.kind) {
    case 'bearings-parallel':
      return `Bearings are too close (${err.angleDeg.toFixed(1)}°). Move further away from the first position and try again.`;
    case 'intersection-behind':
      return 'The two bearings don\u2019t cross ahead of you — at least one is pointing the wrong way.';
    case 'positions-identical':
      return "You haven't moved since the first sighting. Move at least 20m and try again.";
  }
}
