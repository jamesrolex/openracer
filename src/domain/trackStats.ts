/**
 * Pure stats over a sequence of track points. Consuming screens pass an
 * array of points sorted by `recordedAt` asc; helpers compute:
 *  - total distance sailed (sum of leg distances between consecutive points)
 *  - duration (endTime - startTime)
 *  - max / average SOG in knots
 *  - track bounding box (for eventual chart plotting)
 *
 * No I/O — tested standalone.
 */

import type { TrackPoint } from '../stores/raceSessionsRepo';
import type { MetresPerSecond } from '../types/signalk';

import { METRES_PER_NAUTICAL_MILE, metresPerSecondToKnots } from '../utils/format';
import { distanceBetween } from '../utils/geo';

export interface TrackStats {
  pointCount: number;
  /** Metres, great-circle sum of consecutive legs. */
  distanceMetres: number;
  /** Nautical miles, convenience for display. */
  distanceNm: number;
  /** Seconds, or 0 if fewer than 2 points. */
  durationSeconds: number;
  /** Knots, or null if no sog samples. */
  maxSogKnots: number | null;
  averageSogKnots: number | null;
  /** null if fewer than 2 points. */
  boundingBox: { minLat: number; maxLat: number; minLon: number; maxLon: number } | null;
  firstAt: string | null;
  lastAt: string | null;
}

export function computeTrackStats(points: TrackPoint[]): TrackStats {
  if (points.length === 0) {
    return {
      pointCount: 0,
      distanceMetres: 0,
      distanceNm: 0,
      durationSeconds: 0,
      maxSogKnots: null,
      averageSogKnots: null,
      boundingBox: null,
      firstAt: null,
      lastAt: null,
    };
  }

  let distanceMetres = 0;
  let maxSog: MetresPerSecond | null = null;
  let sogSum = 0;
  let sogCount = 0;
  let minLat = points[0]!.latitude;
  let maxLat = points[0]!.latitude;
  let minLon = points[0]!.longitude;
  let maxLon = points[0]!.longitude;

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!;
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;

    if (i > 0) {
      const prev = points[i - 1]!;
      distanceMetres += distanceBetween(
        { latitude: prev.latitude, longitude: prev.longitude },
        { latitude: p.latitude, longitude: p.longitude },
      );
    }

    if (p.sog !== null && p.sog >= 0 && Number.isFinite(p.sog)) {
      if (maxSog === null || p.sog > maxSog) maxSog = p.sog;
      sogSum += p.sog;
      sogCount += 1;
    }
  }

  const firstAt = points[0]!.recordedAt;
  const lastAt = points[points.length - 1]!.recordedAt;
  const durationSeconds = Math.max(
    0,
    (new Date(lastAt).getTime() - new Date(firstAt).getTime()) / 1000,
  );

  return {
    pointCount: points.length,
    distanceMetres,
    distanceNm: distanceMetres / METRES_PER_NAUTICAL_MILE,
    durationSeconds,
    maxSogKnots: maxSog === null ? null : metresPerSecondToKnots(maxSog),
    averageSogKnots:
      sogCount === 0 ? null : metresPerSecondToKnots(sogSum / sogCount),
    boundingBox: points.length >= 2 ? { minLat, maxLat, minLon, maxLon } : null,
    firstAt,
    lastAt,
  };
}

/** Format a duration in seconds as "MM:SS" (or "HH:MM:SS" past an hour). */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  if (hh > 0) return `${hh}:${pad(mm)}:${pad(ss)}`;
  return `${pad(mm)}:${pad(ss)}`;
}
