/**
 * sailorLog — derive lifetime sailing aggregates from existing
 * persisted data. No new state; pure read-side composition.
 *
 * Race miles + race count come from `race_sessions` joined to
 * `race_track_points` (sum of consecutive-point distances). Cruise
 * miles + lifetime max SOG come from useTripStore (already
 * persisted). Days at sea is the count of distinct UTC dates across
 * the union of those two sources.
 *
 * Pure-ish: takes injected data so it's unit-testable without the
 * SQLite layer; the screen-side wrapper plumbs the live data in.
 */

import type { TrackPoint } from '../stores/raceSessionsRepo';
import type { RaceSession } from '../types/race';

import { computeTrackDistance } from './courseDistance';

export interface SailorLogInputs {
  /** All race sessions (finished + abandoned + in-progress). */
  sessions: RaceSession[];
  /** Track points per session id, keyed by session.id. */
  pointsBySession: Map<string, TrackPoint[]>;
  /** Lifetime cruise miles in metres (useTripStore.lifetimeCruiseMetres). */
  lifetimeCruiseMetres: number;
  /** Lifetime cruise max SOG in m/s. */
  lifetimeCruiseMaxSogMps: number;
}

export interface SailorLogAggregates {
  totalRaceMetres: number;
  totalCruiseMetres: number;
  /** Sum of race + cruise miles. */
  totalLifetimeMetres: number;
  raceCount: number;
  finishedRaceCount: number;
  abandonedRaceCount: number;
  /** Distinct UTC dates with any race or cruise activity. */
  daysAtSea: number;
  /** Max SOG (m/s) across every track point + cruise lifetime. */
  maxSogMps: number;
  /** ISO timestamp of the most recent race start, or null. */
  lastRaceAt: string | null;
}

export function computeAggregates(input: SailorLogInputs): SailorLogAggregates {
  let totalRaceMetres = 0;
  let maxSogFromTracks = 0;
  let lastRaceAt: string | null = null;
  const dateSet = new Set<string>();
  let finished = 0;
  let abandoned = 0;

  for (const session of input.sessions) {
    if (session.state === 'finished') finished += 1;
    if (session.state === 'abandoned') abandoned += 1;
    if (lastRaceAt === null || session.startedAt > lastRaceAt) {
      lastRaceAt = session.startedAt;
    }
    dateSet.add(session.startedAt.slice(0, 10));

    const points = input.pointsBySession.get(session.id) ?? [];
    if (points.length > 1) {
      totalRaceMetres += computeTrackDistance(
        points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      );
      for (const p of points) {
        if (p.sog !== null && p.sog > maxSogFromTracks) {
          maxSogFromTracks = p.sog;
        }
        dateSet.add(p.recordedAt.slice(0, 10));
      }
    }
  }

  const maxSogMps = Math.max(maxSogFromTracks, input.lifetimeCruiseMaxSogMps);
  const totalCruiseMetres = input.lifetimeCruiseMetres;
  const totalLifetimeMetres = totalRaceMetres + totalCruiseMetres;

  return {
    totalRaceMetres,
    totalCruiseMetres,
    totalLifetimeMetres,
    raceCount: input.sessions.length,
    finishedRaceCount: finished,
    abandonedRaceCount: abandoned,
    daysAtSea: dateSet.size,
    maxSogMps,
    lastRaceAt,
  };
}
