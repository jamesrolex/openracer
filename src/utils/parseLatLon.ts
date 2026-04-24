/**
 * Forgiving lat/lon parser for marine input. Accepts the three formats a
 * sailor is likely to type on a phone keyboard:
 *
 *   decimal   "52.8205"                          "-4.5025"
 *   DMM       "52 49.230 N"  "52° 49.230' N"    "52:49.230N"
 *   DMS       "52 49 13.8 N" "52° 49' 13.8\" N"
 *
 * Hemisphere letter is optional when a sign is already present (`-4.5025`
 * parses as west). If both are supplied they must agree or the input is
 * rejected.
 *
 * Returns the value in decimal degrees. Throws a descriptive Error on
 * anything unparseable — callers surface the message next to the input.
 */

import type { Latitude, Longitude } from '../types/signalk';

export type LatLonAxis = 'lat' | 'lon';

/** Parse a single-axis coordinate string. */
export function parseCoordinate(input: string, axis: LatLonAxis): number {
  const raw = input.trim();
  if (!raw) throw new Error('Coordinate is empty');

  // Hemisphere letter anywhere in the string — strip it out after recording.
  const hemMatch = raw.match(/([nsew])/i);
  const hemisphere = hemMatch ? hemMatch[1]!.toUpperCase() : null;

  if (hemisphere) {
    const expected: Record<LatLonAxis, string[]> = {
      lat: ['N', 'S'],
      lon: ['E', 'W'],
    };
    if (!expected[axis].includes(hemisphere)) {
      throw new Error(
        `Hemisphere "${hemisphere}" does not match ${axis === 'lat' ? 'latitude (N/S)' : 'longitude (E/W)'}`,
      );
    }
  }

  // A leading `-` on the whole input is the degree sign. Any other `-`
  // inside the string is a token separator ("52-49.230N"), so we extract
  // the sign once up front and then strip all `-` from the remainder.
  const stripped = raw.replace(/[nsewNSEW]/g, ' ').trim();
  const signedNegative = stripped.startsWith('-');
  const unsigned = signedNegative ? stripped.slice(1) : stripped;
  const cleaned = unsigned.replace(/[^0-9.\s]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) throw new Error('No numbers found in coordinate');
  if (tokens.length > 3) throw new Error('Too many numbers in coordinate');

  const numbers = tokens.map((t) => {
    const n = Number(t);
    if (!Number.isFinite(n)) throw new Error(`Cannot read "${t}" as a number`);
    return n;
  });
  const hemisphereNegative = hemisphere === 'S' || hemisphere === 'W';

  if (hemisphere && signedNegative && !hemisphereNegative) {
    throw new Error(`Negative value with hemisphere "${hemisphere}" — pick one`);
  }

  const abs = numbers.map((n) => Math.abs(n));
  let decimal: number;
  if (abs.length === 1) {
    decimal = abs[0]!;
  } else if (abs.length === 2) {
    // DMM: degrees + decimal minutes
    const [deg, min] = abs as [number, number];
    if (min < 0 || min >= 60) throw new Error(`Minutes must be 0–59.999, got ${min}`);
    decimal = deg + min / 60;
  } else {
    // DMS: degrees + minutes + decimal seconds
    const [deg, min, sec] = abs as [number, number, number];
    if (min < 0 || min >= 60) throw new Error(`Minutes must be 0–59, got ${min}`);
    if (sec < 0 || sec >= 60) throw new Error(`Seconds must be 0–59.999, got ${sec}`);
    decimal = deg + min / 60 + sec / 3600;
  }

  const sign = hemisphereNegative || signedNegative ? -1 : 1;
  const signed = sign * decimal;

  // Range check.
  const max = axis === 'lat' ? 90 : 180;
  if (signed < -max || signed > max) {
    throw new Error(
      `${axis === 'lat' ? 'Latitude' : 'Longitude'} must be between -${max} and ${max}`,
    );
  }

  return signed;
}

/**
 * Parse a pair "lat, lon" (comma or semicolon separated, or two lines).
 * Convenience for pasting coordinates copied from an external source.
 */
export function parseLatLon(input: string): { latitude: Latitude; longitude: Longitude } {
  const parts = input
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length !== 2) {
    throw new Error('Expected "latitude, longitude" — two comma-separated values');
  }
  return {
    latitude: parseCoordinate(parts[0]!, 'lat'),
    longitude: parseCoordinate(parts[1]!, 'lon'),
  };
}
