/**
 * Sort a list of marks by great-circle distance from a reference position.
 * Null position → original order preserved (no sort) so first-time users
 * without a GPS fix still get a sensible list.
 */

import type { Mark } from '../types/mark';
import type { GeoPosition } from '../types/signalk';

import { distanceBetween } from './geo';

export interface MarkWithDistance {
  mark: Mark;
  /** Metres from reference position. Infinity if reference is null. */
  distanceMetres: number;
}

export function sortMarksByDistance(
  marks: Mark[],
  from: GeoPosition | null,
): MarkWithDistance[] {
  const enriched: MarkWithDistance[] = marks.map((m) => ({
    mark: m,
    distanceMetres:
      from === null
        ? Infinity
        : distanceBetween(from, { latitude: m.latitude, longitude: m.longitude }),
  }));

  if (from === null) return enriched;

  enriched.sort((a, b) => a.distanceMetres - b.distanceMetres);
  return enriched;
}
