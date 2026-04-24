/**
 * Display-side formatting helpers. No business logic — pure string conversions.
 *
 * Unit conventions (skills/marine-domain/SKILL.md):
 * - Internal speed in m/s, display in knots
 * - Internal distance in metres, display in nm / km / m per caller choice
 * - Internal bearing in degrees true 0-360, display as e.g. "270°"
 * - Internal coords decimal degrees, display default DMM (degrees + decimal minutes)
 */

import type { DegreesTrue, Knots, Latitude, Longitude, Metres, MetresPerSecond } from '../types/signalk';

/** 1 knot = 0.514444 metres per second (exact to IUPAC definition). */
export const METRES_PER_SECOND_PER_KNOT = 0.5144444444444444;

/** 1 nautical mile = 1852 metres (IUPAC exact). */
export const METRES_PER_NAUTICAL_MILE = 1852;

export function metresPerSecondToKnots(mps: MetresPerSecond): Knots {
  return mps / METRES_PER_SECOND_PER_KNOT;
}

export function knotsToMetresPerSecond(kts: Knots): MetresPerSecond {
  return kts * METRES_PER_SECOND_PER_KNOT;
}

export type DistanceUnit = 'nm' | 'km' | 'm';

/**
 * Format a distance in metres for display.
 * - 'nm' — divides by 1852, two decimals. "0.42 nm".
 * - 'km' — divides by 1000, two decimals. "1.23 km".
 * - 'm' — integer metres. "150 m".
 *
 * Negative input is taken as absolute distance (distance has no sign).
 */
export function formatDistance(metres: Metres, unit: DistanceUnit): string {
  const abs = Math.abs(metres);
  if (unit === 'nm') return `${(abs / METRES_PER_NAUTICAL_MILE).toFixed(2)} nm`;
  if (unit === 'km') return `${(abs / 1000).toFixed(2)} km`;
  return `${Math.round(abs)} m`;
}

/**
 * Format a bearing as "NNN°" where NNN is 0-359. Input is normalised to
 * [0, 360) regardless of sign or magnitude, so `-10` → "350°", `370` → "10°".
 */
export function formatBearing(degrees: DegreesTrue): string {
  const normalised = ((degrees % 360) + 360) % 360;
  return `${Math.round(normalised)}°`;
}

export type LatLonFormat = 'dms' | 'dmm' | 'decimal';

/**
 * Format a coordinate pair. DMM is the marine default — "52° 49.230' N".
 * Longitude pads to 3° per marine convention. Hemisphere letters replace signs.
 */
export function formatLatLon(
  latitude: Latitude,
  longitude: Longitude,
  format: LatLonFormat,
): string {
  if (format === 'decimal') {
    return `${formatDecimalComponent(latitude, 'lat')}, ${formatDecimalComponent(longitude, 'lon')}`;
  }
  if (format === 'dms') {
    return `${formatDMSComponent(latitude, 'lat')}, ${formatDMSComponent(longitude, 'lon')}`;
  }
  return `${formatDMMComponent(latitude, 'lat')}, ${formatDMMComponent(longitude, 'lon')}`;
}

function formatDecimalComponent(value: number, axis: 'lat' | 'lon'): string {
  const hemisphere = hemisphereLetter(value, axis);
  // Decimal format mimics chart-plotter display: no zero-padding on the
  // whole-degree part. DMM and DMS retain the marine 2- / 3-digit padding
  // convention since that's what course papers and chart overlays expect.
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`;
}

function formatDMMComponent(value: number, axis: 'lat' | 'lon'): string {
  const hemisphere = hemisphereLetter(value, axis);
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const pad = axis === 'lat' ? 2 : 3;
  return `${String(degrees).padStart(pad, '0')}° ${minutes.toFixed(3).padStart(6, '0')}' ${hemisphere}`;
}

function formatDMSComponent(value: number, axis: 'lat' | 'lon'): string {
  const hemisphere = hemisphereLetter(value, axis);
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  const pad = axis === 'lat' ? 2 : 3;
  return `${String(degrees).padStart(pad, '0')}° ${String(minutes).padStart(2, '0')}' ${seconds.toFixed(1).padStart(4, '0')}" ${hemisphere}`;
}

function hemisphereLetter(value: number, axis: 'lat' | 'lon'): 'N' | 'S' | 'E' | 'W' {
  if (axis === 'lat') return value >= 0 ? 'N' : 'S';
  return value >= 0 ? 'E' : 'W';
}
