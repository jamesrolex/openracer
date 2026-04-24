/**
 * courseDistance — pure functions for computing how long a course is and
 * how much of it has been sailed.
 *
 * Leg length rules:
 *  - A leg with one mark: the length is the distance from the previous
 *    leg's "exit point" (its last mark) to this leg's mark. The very
 *    first leg has no previous, so its length is zero — the course's
 *    total is measured from the first mark.
 *  - A leg with two marks (start / finish / gate): the "centre" of the
 *    line is the midpoint of the two marks. Leg length uses that
 *    midpoint as both the entry and exit point.
 *
 * This is a conservative model — in real racing a start leg has zero
 * length (the start line is at time zero), and a gate leg is routed
 * through one mark not both. But for the "how much of the course have
 * we sailed" readout the midpoint model is plenty accurate and doesn't
 * require the sailor to declare which gate mark they rounded.
 */

import type { Leg } from '../types/course';
import type { Mark } from '../types/mark';
import type { GeoPosition } from '../types/signalk';
import { METRES_PER_NAUTICAL_MILE } from '../utils/format';
import { distanceBetween } from '../utils/geo';

export interface CourseDistance {
  /** Total distance in metres. 0 if the course has fewer than 2 rounding points. */
  totalMetres: number;
  /** Per-leg distances, same order as the input legs. First leg is 0. */
  perLegMetres: number[];
}

interface LegAnchor {
  leg: Leg;
  centre: GeoPosition | null;
}

function anchorFor(leg: Leg, marks: Mark[]): LegAnchor {
  const matched = leg.markIds
    .map((id) => marks.find((m) => m.id === id))
    .filter((m): m is Mark => Boolean(m));
  if (matched.length === 0) return { leg, centre: null };
  if (matched.length === 1) {
    return {
      leg,
      centre: { latitude: matched[0]!.latitude, longitude: matched[0]!.longitude },
    };
  }
  // Midpoint for 2+ mark legs (start / finish / gate). We average — fine
  // for two points, approximates for three which is a non-standard case.
  const lat =
    matched.reduce((sum, m) => sum + m.latitude, 0) / matched.length;
  const lon =
    matched.reduce((sum, m) => sum + m.longitude, 0) / matched.length;
  return { leg, centre: { latitude: lat, longitude: lon } };
}

/**
 * Compute the course length in metres, summing the distance between each
 * leg's anchor point (mark or midpoint). Unfilled legs contribute zero.
 */
export function computeCourseDistance(legs: Leg[], marks: Mark[]): CourseDistance {
  const anchors = legs.map((l) => anchorFor(l, marks));
  const perLeg: number[] = [];
  let total = 0;
  for (let i = 0; i < anchors.length; i++) {
    if (i === 0 || !anchors[i - 1]!.centre || !anchors[i]!.centre) {
      perLeg.push(0);
      continue;
    }
    const segment = distanceBetween(anchors[i - 1]!.centre!, anchors[i]!.centre!);
    perLeg.push(segment);
    total += segment;
  }
  return { totalMetres: total, perLegMetres: perLeg };
}

/**
 * Given a list of GPS track points (ordered by time), sum the distance
 * between consecutive points. Ignores jitter under 2 m and rejects jumps
 * over 500 m (signal loss, not real motion).
 */
export function computeTrackDistance(
  points: readonly GeoPosition[],
): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = distanceBetween(points[i - 1]!, points[i]!);
    if (d < 2 || d > 500) continue;
    total += d;
  }
  return total;
}

/**
 * Progress percentage capped at 100 — a sailor can overshoot the course
 * length (extra tacks, general recall, drifting past a mark) and we
 * don't want a scoreboard at 137%.
 */
export function progressPercent(sailedMetres: number, totalMetres: number): number {
  if (totalMetres <= 0) return 0;
  return Math.min(100, Math.max(0, (sailedMetres / totalMetres) * 100));
}

/** Convenience — metres to nautical miles, rounded to 2 dp. */
export function metresToNm(m: number): number {
  return Math.round((m / METRES_PER_NAUTICAL_MILE) * 100) / 100;
}
