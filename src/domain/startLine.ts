/**
 * Start-line geometry — pure, tested in isolation.
 *
 * A start line is the great-circle segment between the committee-boat
 * end and the pin end. From the boat's position + SOG + COG we derive:
 *  - perpendicular distance-to-line (metres, negative = OCS / over early)
 *  - time-to-line at current SOG (seconds, null if stationary / wrong way)
 *  - line length + line bearing (for rendering)
 *  - line bias vs true wind (degrees, optional)
 *
 * ISAF convention assumed: committee boat (CB) is the starboard end,
 * pin is the port end. Sign of distance-to-line is positive on the
 * pre-start side of the line, negative on the course side (OCS).
 *
 * Approximation: we project onto a local ENU plane centred on the
 * line midpoint. Good to ~0.1% for a start line up to a mile long.
 */

import type { GeoPosition, MetresPerSecond } from '../types/signalk';

import { bearingBetween, distanceBetween } from './../utils/geo';

export interface StartLineGeometry {
  /** Line length in metres between the two ends. */
  length: number;
  /** Bearing from CB → pin, degrees true 0-360. */
  bearing: number;
  /** Midpoint of the line. */
  midpoint: GeoPosition;
}

export interface BoatStartState {
  /** Distance from boat to line, metres. Negative = OCS (over early). */
  distanceMetres: number;
  /** Perpendicular direction from boat to the line. `ahead` = heading
   *  towards line; `behind` = OCS. */
  side: 'ahead' | 'behind' | 'on-line';
  /** Seconds until boat reaches the line at current SOG; null if
   *  stationary, OCS, or moving parallel to / away from the line. */
  secondsToLine: number | null;
}

export interface LineBias {
  /** Degrees the line deviates from being perpendicular to the wind.
   *  Positive = favoured end is the committee boat end; negative = pin. */
  degrees: number;
  favoured: 'committee' | 'pin' | 'neutral';
}

/**
 * Local ENU conversion — distance in metres per degree of lat/lon at
 * the midpoint's latitude. Good enough for any single start line on
 * the planet.
 */
function metresPerDegree(lat: number): { mPerLat: number; mPerLon: number } {
  const latRad = (lat * Math.PI) / 180;
  return {
    mPerLat: 111132, // avg
    mPerLon: 111132 * Math.cos(latRad),
  };
}

function toEnu(
  p: GeoPosition,
  origin: GeoPosition,
): { x: number; y: number } {
  const { mPerLat, mPerLon } = metresPerDegree(origin.latitude);
  return {
    x: (p.longitude - origin.longitude) * mPerLon,
    y: (p.latitude - origin.latitude) * mPerLat,
  };
}

export function makeStartLineGeometry(
  committeeEnd: GeoPosition,
  pinEnd: GeoPosition,
): StartLineGeometry {
  const length = distanceBetween(committeeEnd, pinEnd);
  const bearing = bearingBetween(committeeEnd, pinEnd);
  const midpoint: GeoPosition = {
    latitude: (committeeEnd.latitude + pinEnd.latitude) / 2,
    longitude: (committeeEnd.longitude + pinEnd.longitude) / 2,
  };
  return { length, bearing, midpoint };
}

/**
 * Compute boat-to-line state.
 *
 * @param boat Boat GPS position.
 * @param cogDegrees Boat course over ground, degrees true 0-360. Null if unavailable.
 * @param sogMetresPerSecond Boat speed over ground. Null if unavailable.
 * @param committeeEnd Start-line committee-boat end (starboard end).
 * @param pinEnd Start-line pin end (port end).
 *
 * The line side convention: standing at the midpoint looking along the
 * line bearing (CB → pin), "ahead" is to the right (the normal pre-start
 * side for port-approach). Distance is signed such that positive = pre-start.
 */
export function computeBoatStartState(
  boat: GeoPosition,
  cogDegrees: number | null,
  sogMetresPerSecond: MetresPerSecond | null,
  committeeEnd: GeoPosition,
  pinEnd: GeoPosition,
): BoatStartState {
  const geo = makeStartLineGeometry(committeeEnd, pinEnd);
  const origin = geo.midpoint;
  const cb = toEnu(committeeEnd, origin);
  const pin = toEnu(pinEnd, origin);
  const b = toEnu(boat, origin);

  // Line direction vector (CB → pin).
  const lineDx = pin.x - cb.x;
  const lineDy = pin.y - cb.y;
  const len = Math.hypot(lineDx, lineDy);
  if (len === 0) {
    return { distanceMetres: 0, side: 'on-line', secondsToLine: null };
  }

  // Unit line vector and normal. Normal points to "pre-start side":
  // rotate line vector by -90° (clockwise from CB→pin) → that's the
  // committee-boat-looks-down-line convention.
  const ux = lineDx / len;
  const uy = lineDy / len;
  const nx = uy;
  const ny = -ux;

  // Boat relative to line midpoint.
  const mx = b.x - (cb.x + pin.x) / 2;
  const my = b.y - (cb.y + pin.y) / 2;

  // Signed perpendicular distance along the normal.
  const perp = mx * nx + my * ny;
  const side: BoatStartState['side'] =
    perp > 0.1 ? 'ahead' : perp < -0.1 ? 'behind' : 'on-line';

  // Time to line: project boat velocity onto -normal (towards line).
  // Positive speed-to-line = heading at the line.
  let secondsToLine: number | null = null;
  if (
    sogMetresPerSecond !== null &&
    sogMetresPerSecond > 0 &&
    cogDegrees !== null &&
    Number.isFinite(cogDegrees)
  ) {
    const cogRad = (cogDegrees * Math.PI) / 180;
    // ENU convention: x=east, y=north. Bearing 0° = north = +y axis, 90° = east = +x.
    const vx = sogMetresPerSecond * Math.sin(cogRad);
    const vy = sogMetresPerSecond * Math.cos(cogRad);
    // Component towards line = -(velocity · normal). If boat is ahead
    // (perp > 0), we want velocity pointing along -normal.
    const closingSpeed = -(vx * nx + vy * ny);
    if (closingSpeed > 0.05 && side === 'ahead') {
      secondsToLine = perp / closingSpeed;
    }
  }

  return {
    distanceMetres: perp,
    side,
    secondsToLine,
  };
}

/**
 * Line bias vs true wind. Optional — hide the readout if `trueWindDirection`
 * is unavailable.
 *
 * A start line is "square" when its bearing is perpendicular to the wind.
 * The favoured end is the one closer to upwind. `degrees` > 0 means the
 * committee-boat end is favoured; < 0 means pin; |deg| < 3 = neutral.
 */
export function computeLineBias(
  committeeEnd: GeoPosition,
  pinEnd: GeoPosition,
  trueWindDirection: number,
): LineBias {
  const lineBearing = bearingBetween(committeeEnd, pinEnd); // CB → pin
  // Perpendicular to the line, going upwind, is lineBearing - 90.
  const perpendicular = (lineBearing - 90 + 360) % 360;
  let diff = (trueWindDirection - perpendicular + 540) % 360 - 180;
  // diff > 0: wind rotated clockwise from perpendicular → CB end is upwind.
  // diff < 0: wind rotated counterclockwise → pin end is upwind.
  const favoured: LineBias['favoured'] =
    Math.abs(diff) < 3 ? 'neutral' : diff > 0 ? 'committee' : 'pin';
  return { degrees: diff, favoured };
}
