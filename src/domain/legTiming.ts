/**
 * Per-leg timing — Phase 1.14.
 *
 * Given a recorded track + the course that was sailed, derive the
 * elapsed time and distance of each leg. The post-race breakdown a
 * sailor wants to see: "leg 1 took 4:32, leg 2 took 5:18, the run was
 * 6:01". A first cut at race-debrief data without polar attribution
 * (that's Phase 4).
 *
 * Algorithm:
 *   - Walk the track points in time order.
 *   - For each leg in the course (after the start), find the first
 *     track point that comes within ROUND_THRESHOLD of the leg's
 *     "target point" (the rounding mark, or the midpoint of a gate /
 *     finish line).
 *   - The leg starts at the previous rounding point (or the first
 *     track point for leg 1) and ends at the new rounding point.
 *
 * If a leg never approaches the target, it's reported as `incomplete`
 * with the duration up to the last track point. This keeps abandoned
 * or finished-early races readable.
 *
 * Pure transformation. No I/O.
 */

import type { Leg } from '../types/course';
import type { Mark } from '../types/mark';
import type { TrackPoint } from '../stores/raceSessionsRepo';
import { distanceBetween } from '../utils/geo';

/** A track point is "at the mark" within this radius. ~30 m matches the
 *  rounding tolerance the spec calls out for club racing. */
const ROUND_THRESHOLD_METRES = 30;

export interface LegTiming {
  /** From the source course. Stable across re-computation. */
  legId: string;
  legLabel: string;
  /** Sequential index in the course (0-based). */
  index: number;
  /** Seconds spent on this leg. Null if incomplete (no rounding point
   *  found in the track). */
  durationSeconds: number | null;
  /** Track distance sailed during the leg. Null if incomplete. */
  distanceMetres: number | null;
  /** When the leg ended (rounding point recordedAt) — null if incomplete. */
  endedAt: string | null;
  /** Did the boat actually pass the mark? */
  status: 'complete' | 'incomplete';
}

export interface LegTimingsResult {
  legs: LegTiming[];
  /** Total duration of the timed legs (sum of `durationSeconds` for
   *  complete + the last incomplete leg's elapsed). */
  totalDurationSeconds: number;
  /** Total track distance over all included legs (metres). */
  totalDistanceMetres: number;
}

interface TargetPoint {
  latitude: number;
  longitude: number;
}

/**
 * Build the geographic target for a leg — the point the boat passes
 * through to "complete" the leg. For single-mark legs that's the mark.
 * For two-mark legs (gate / start / finish), it's the midpoint of the
 * line, which behaves correctly for any boat that crosses the line.
 */
function targetForLeg(leg: Leg, markLookup: Map<string, Mark>): TargetPoint | null {
  if (leg.markIds.length === 0) return null;
  const points: TargetPoint[] = [];
  for (const id of leg.markIds) {
    const m = markLookup.get(id);
    if (!m) return null;
    points.push({ latitude: m.latitude, longitude: m.longitude });
  }
  if (points.length === 1) return points[0]!;
  // Centroid for line-style legs.
  const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lon = points.reduce((s, p) => s + p.longitude, 0) / points.length;
  return { latitude: lat, longitude: lon };
}

/**
 * Compute per-leg timing across the track.
 *
 * `legs` should be the course legs in sail order (starting with the
 * start leg). `track` should be sorted ascending by recordedAt.
 */
export function computeLegTimings(
  legs: readonly Leg[],
  track: readonly TrackPoint[],
  marks: readonly Mark[],
): LegTimingsResult {
  if (legs.length === 0 || track.length === 0) {
    return { legs: [], totalDurationSeconds: 0, totalDistanceMetres: 0 };
  }

  const markLookup = new Map<string, Mark>();
  for (const m of marks) markLookup.set(m.id, m);

  const legTimings: LegTiming[] = [];

  // We treat the first track point as the start gun moment for legging
  // purposes. The start leg's "end" is the first time the boat crosses
  // through the start line midpoint from behind, but for v1 we use the
  // same threshold-radius rule as every other leg.
  let cursor = 0; // index into track of the leg's start point
  let totalDistanceMetres = 0;
  let totalDurationSeconds = 0;

  for (let i = 0; i < legs.length; i += 1) {
    const leg = legs[i]!;
    const target = targetForLeg(leg, markLookup);

    if (!target) {
      legTimings.push({
        legId: leg.id,
        legLabel: leg.label,
        index: i,
        durationSeconds: null,
        distanceMetres: null,
        endedAt: null,
        status: 'incomplete',
      });
      continue;
    }

    // Search the remaining track for the first point within range — but
    // require the boat to leave the rounding radius before re-entering
    // it counts. This handles the common case where the start point is
    // already inside the threshold (start line midpoint); without it
    // every leg after the start would zero-duration.
    let endIdx = -1;
    let hasLeftRadius = false;
    for (let j = cursor; j < track.length; j += 1) {
      const p = track[j]!;
      const d = distanceBetween(
        { latitude: p.latitude, longitude: p.longitude },
        target,
      );
      if (!hasLeftRadius) {
        if (d > ROUND_THRESHOLD_METRES) hasLeftRadius = true;
        continue;
      }
      if (d <= ROUND_THRESHOLD_METRES) {
        endIdx = j;
        break;
      }
    }

    if (endIdx < 0) {
      // Leg incomplete — boat never reached the mark within tolerance.
      // Report the elapsed time + distance from cursor to last point so
      // the sailor sees what they did sail.
      const start = track[cursor]!;
      const end = track[track.length - 1]!;
      const dur =
        (Date.parse(end.recordedAt) - Date.parse(start.recordedAt)) / 1000;
      const dist = sumDistance(track, cursor, track.length - 1);
      totalDurationSeconds += dur;
      totalDistanceMetres += dist;
      legTimings.push({
        legId: leg.id,
        legLabel: leg.label,
        index: i,
        durationSeconds: dur,
        distanceMetres: dist,
        endedAt: null,
        status: 'incomplete',
      });
      // Stop the walk — every subsequent leg is also incomplete.
      for (let k = i + 1; k < legs.length; k += 1) {
        const lk = legs[k]!;
        legTimings.push({
          legId: lk.id,
          legLabel: lk.label,
          index: k,
          durationSeconds: null,
          distanceMetres: null,
          endedAt: null,
          status: 'incomplete',
        });
      }
      break;
    }

    const start = track[cursor]!;
    const end = track[endIdx]!;
    const dur =
      (Date.parse(end.recordedAt) - Date.parse(start.recordedAt)) / 1000;
    const dist = sumDistance(track, cursor, endIdx);
    totalDurationSeconds += dur;
    totalDistanceMetres += dist;
    legTimings.push({
      legId: leg.id,
      legLabel: leg.label,
      index: i,
      durationSeconds: dur,
      distanceMetres: dist,
      endedAt: end.recordedAt,
      status: 'complete',
    });
    cursor = endIdx;
  }

  return { legs: legTimings, totalDurationSeconds, totalDistanceMetres };
}

function sumDistance(
  track: readonly TrackPoint[],
  startIdx: number,
  endIdx: number,
): number {
  let total = 0;
  for (let k = startIdx + 1; k <= endIdx; k += 1) {
    const a = track[k - 1]!;
    const b = track[k]!;
    total += distanceBetween(
      { latitude: a.latitude, longitude: a.longitude },
      { latitude: b.latitude, longitude: b.longitude },
    );
  }
  return total;
}

/** mm:ss formatter — "4:32" or "1:05:18" if hours > 0. */
export function formatLegDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const total = Math.max(0, Math.round(seconds));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  if (hh > 0) {
    return `${hh}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  }
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}
