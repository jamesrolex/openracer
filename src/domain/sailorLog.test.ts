import { computeAggregates } from './sailorLog';
import type { TrackPoint } from '../stores/raceSessionsRepo';
import type { RaceSession } from '../types/race';

function session(
  id: string,
  startedAt: string,
  state: RaceSession['state'],
): RaceSession {
  return {
    id,
    courseId: null,
    startedAt,
    finishedAt: state === 'finished' ? startedAt : null,
    state,
  };
}

let nextPid = 1;
function pt(
  sessionId: string,
  lat: number,
  lon: number,
  recordedAt: string,
  sog: number | null = null,
): TrackPoint {
  return {
    id: nextPid++,
    sessionId,
    recordedAt,
    latitude: lat,
    longitude: lon,
    sog,
    cog: null,
    heading: null,
    accuracy: null,
  };
}

describe('computeAggregates', () => {
  it('zero state when no sessions + no cruise miles', () => {
    const out = computeAggregates({
      sessions: [],
      pointsBySession: new Map(),
      lifetimeCruiseMetres: 0,
      lifetimeCruiseMaxSogMps: 0,
    });
    expect(out.totalRaceMetres).toBe(0);
    expect(out.totalCruiseMetres).toBe(0);
    expect(out.raceCount).toBe(0);
    expect(out.daysAtSea).toBe(0);
    expect(out.maxSogMps).toBe(0);
    expect(out.lastRaceAt).toBeNull();
  });

  it('counts finished + abandoned races separately', () => {
    const out = computeAggregates({
      sessions: [
        session('s1', '2026-04-25T18:00:00Z', 'finished'),
        session('s2', '2026-04-24T18:00:00Z', 'finished'),
        session('s3', '2026-04-23T18:00:00Z', 'abandoned'),
      ],
      pointsBySession: new Map(),
      lifetimeCruiseMetres: 0,
      lifetimeCruiseMaxSogMps: 0,
    });
    expect(out.raceCount).toBe(3);
    expect(out.finishedRaceCount).toBe(2);
    expect(out.abandonedRaceCount).toBe(1);
    expect(out.lastRaceAt).toBe('2026-04-25T18:00:00Z');
  });

  it('sums track distance per session', () => {
    const points = [
      pt('s1', 52.82, -4.5, '2026-04-25T18:00:01Z', 4),
      pt('s1', 52.82001, -4.5, '2026-04-25T18:00:02Z', 4),
      pt('s1', 52.82002, -4.5, '2026-04-25T18:00:03Z', 4),
      pt('s1', 52.82003, -4.5, '2026-04-25T18:00:04Z', 4),
      pt('s1', 52.82004, -4.5, '2026-04-25T18:00:05Z', 4),
    ];
    const out = computeAggregates({
      sessions: [session('s1', '2026-04-25T18:00:00Z', 'finished')],
      pointsBySession: new Map([['s1', points]]),
      lifetimeCruiseMetres: 0,
      lifetimeCruiseMaxSogMps: 0,
    });
    // 4 segments x ~1.1 m each = ~4.4 m. NOTE: computeTrackDistance
    // drops segments < 2 m as jitter, so this case returns 0.
    expect(out.totalRaceMetres).toBe(0);
  });

  it('sums real (>2 m) segments', () => {
    const points = Array.from({ length: 10 }, (_, i) =>
      pt('s1', 52.82 + i * 0.0001, -4.5, `2026-04-25T18:00:0${i}Z`, 4),
    );
    const out = computeAggregates({
      sessions: [session('s1', '2026-04-25T18:00:00Z', 'finished')],
      pointsBySession: new Map([['s1', points]]),
      lifetimeCruiseMetres: 0,
      lifetimeCruiseMaxSogMps: 0,
    });
    // 9 segments × ~11 m ≈ 100 m.
    expect(out.totalRaceMetres).toBeGreaterThan(80);
    expect(out.totalRaceMetres).toBeLessThan(120);
  });

  it('takes max SOG across tracks + cruise lifetime', () => {
    const points = [
      pt('s1', 52.82, -4.5, '2026-04-25T18:00:00Z', 5),
      pt('s1', 52.82001, -4.5, '2026-04-25T18:00:01Z', 7.5),
      pt('s1', 52.82002, -4.5, '2026-04-25T18:00:02Z', 6),
    ];
    const out = computeAggregates({
      sessions: [session('s1', '2026-04-25T18:00:00Z', 'finished')],
      pointsBySession: new Map([['s1', points]]),
      lifetimeCruiseMetres: 0,
      lifetimeCruiseMaxSogMps: 9, // cruise wins
    });
    expect(out.maxSogMps).toBeCloseTo(9, 5);
  });

  it('counts distinct UTC dates as days-at-sea', () => {
    const out = computeAggregates({
      sessions: [
        session('s1', '2026-04-25T18:00:00Z', 'finished'),
        session('s2', '2026-04-25T20:00:00Z', 'finished'), // same day
        session('s3', '2026-04-24T18:00:00Z', 'finished'),
      ],
      pointsBySession: new Map(),
      lifetimeCruiseMetres: 0,
      lifetimeCruiseMaxSogMps: 0,
    });
    expect(out.daysAtSea).toBe(2);
  });

  it('combines race + cruise into total lifetime metres', () => {
    const out = computeAggregates({
      sessions: [],
      pointsBySession: new Map(),
      lifetimeCruiseMetres: 50_000,
      lifetimeCruiseMaxSogMps: 6,
    });
    expect(out.totalCruiseMetres).toBe(50_000);
    expect(out.totalLifetimeMetres).toBe(50_000);
  });
});
