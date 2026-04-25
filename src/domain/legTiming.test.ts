import type { Leg } from '../types/course';
import type { Mark } from '../types/mark';
import type { TrackPoint } from '../stores/raceSessionsRepo';

import { computeLegTimings, formatLegDuration } from './legTiming';

function mark(id: string, latitude: number, longitude: number): Mark {
  return {
    id,
    name: id,
    latitude,
    longitude,
    tier: 'club-seasonal',
    source: 'club-library',
    icon: 'cardinal-n',
    shape: 'spherical',
    validFrom: null,
    validUntil: null,
    owner: 'test',
    confidence: 1,
  };
}

function leg(id: string, label: string, markIds: string[]): Leg {
  return {
    id,
    type: markIds.length === 2 ? 'start' : 'windward',
    label,
    markIds,
    requiredMarks: markIds.length,
    rounding: null,
  };
}

function point(id: number, t: string, lat: number, lon: number): TrackPoint {
  return {
    id,
    sessionId: 's1',
    recordedAt: t,
    latitude: lat,
    longitude: lon,
    sog: 2,
    cog: 0,
    heading: 0,
    accuracy: 5,
  };
}

describe('computeLegTimings', () => {
  it('returns empty result when no legs or no track', () => {
    const a = computeLegTimings([], [point(1, '2026-04-29T00:00:00Z', 0, 0)], []);
    expect(a.legs).toHaveLength(0);
    const b = computeLegTimings([leg('l', 'L', [])], [], []);
    expect(b.legs).toHaveLength(0);
  });

  // 1° latitude ≈ 111,320 m.  0.0009° ≈ 100 m.

  it('times a single complete leg — leaves start radius then rounds mark', () => {
    // Mark at 100m north. Boat sails out of the start radius then
    // approaches the mark.
    const m = mark('m1', 0.0009, 0);
    const legs = [leg('L1', 'Leg 1', ['m1'])];
    const track = [
      point(1, '2026-04-29T00:00:00Z', 0, 0),         // 100m from mark
      point(2, '2026-04-29T00:00:30Z', 0.00045, 0),   // 50m from mark, has left start radius (well outside 30m of mark too)
      point(3, '2026-04-29T00:01:00Z', 0.00088, 0),   // ~2m from mark
    ];
    const result = computeLegTimings(legs, track, [m]);
    expect(result.legs).toHaveLength(1);
    expect(result.legs[0]?.status).toBe('complete');
    expect(result.legs[0]?.durationSeconds).toBe(60);
    expect(result.totalDurationSeconds).toBe(60);
  });

  it('measures multiple sequential legs', () => {
    const m1 = mark('m1', 0.0009, 0);   // 100m north
    const m2 = mark('m2', 0.0018, 0);   // 200m north (100m past m1)
    const legs = [
      leg('L1', 'Leg 1', ['m1']),
      leg('L2', 'Leg 2', ['m2']),
    ];
    const track = [
      point(1, '2026-04-29T00:00:00Z', 0, 0),
      point(2, '2026-04-29T00:00:30Z', 0.00045, 0),    // 50m, leaves m1 radius
      point(3, '2026-04-29T00:01:00Z', 0.00088, 0),    // ~2m to m1 — leg 1 complete
      point(4, '2026-04-29T00:01:30Z', 0.00135, 0),    // 50m past m1, leaves m2 radius
      point(5, '2026-04-29T00:02:30Z', 0.00179, 0),    // ~1m to m2 — leg 2 complete
    ];
    const result = computeLegTimings(legs, track, [m1, m2]);
    expect(result.legs).toHaveLength(2);
    expect(result.legs[0]?.durationSeconds).toBe(60);
    expect(result.legs[1]?.durationSeconds).toBe(90);
    expect(result.legs[0]?.status).toBe('complete');
    expect(result.legs[1]?.status).toBe('complete');
    expect(result.totalDurationSeconds).toBe(150);
  });

  it('marks unreached legs as incomplete', () => {
    const m1 = mark('m1', 0.0009, 0);
    const m2 = mark('m2', 1, 1); // miles away
    const legs = [
      leg('L1', 'Leg 1', ['m1']),
      leg('L2', 'Leg 2', ['m2']),
    ];
    const track = [
      point(1, '2026-04-29T00:00:00Z', 0, 0),
      point(2, '2026-04-29T00:00:30Z', 0.00045, 0),
      point(3, '2026-04-29T00:01:00Z', 0.00088, 0),
    ];
    const result = computeLegTimings(legs, track, [m1, m2]);
    expect(result.legs[0]?.status).toBe('complete');
    expect(result.legs[1]?.status).toBe('incomplete');
    expect(result.legs[1]?.endedAt).toBeNull();
  });

  it('uses the midpoint for two-mark gate / line legs', () => {
    // CB at (0.0009, -0.0001), pin at (0.0009, 0.0001). Midpoint is
    // (0.0009, 0) ~100m north of origin.
    const cb = mark('cb', 0.0009, -0.0001);
    const pin = mark('pin', 0.0009, 0.0001);
    const legs = [leg('L1', 'Line', ['cb', 'pin'])];
    const track = [
      point(1, '2026-04-29T00:00:00Z', 0, 0),
      point(2, '2026-04-29T00:00:30Z', 0.00045, 0),
      point(3, '2026-04-29T00:01:00Z', 0.00088, 0),
    ];
    const result = computeLegTimings(legs, track, [cb, pin]);
    expect(result.legs[0]?.status).toBe('complete');
    expect(result.legs[0]?.durationSeconds).toBe(60);
  });
});

describe('formatLegDuration', () => {
  it('formats seconds as mm:ss when under an hour', () => {
    expect(formatLegDuration(0)).toBe('0:00');
    expect(formatLegDuration(45)).toBe('0:45');
    expect(formatLegDuration(90)).toBe('1:30');
    expect(formatLegDuration(272)).toBe('4:32');
  });

  it('formats seconds as h:mm:ss above an hour', () => {
    expect(formatLegDuration(3661)).toBe('1:01:01');
  });

  it('returns em-dash for null', () => {
    expect(formatLegDuration(null)).toBe('—');
  });
});
