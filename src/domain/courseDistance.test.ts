import {
  computeCourseDistance,
  computeTrackDistance,
  metresToNm,
  progressPercent,
} from './courseDistance';
import type { Leg } from '../types/course';
import type { Mark } from '../types/mark';

function mk(id: string, lat: number, lon: number): Mark {
  return {
    id,
    name: id,
    latitude: lat,
    longitude: lon,
    tier: 'club-seasonal',
    source: 'club-library',
    icon: 'racing-yellow',
    shape: 'spherical',
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: null,
    owner: 'test',
    confidence: 1,
  };
}

function leg(id: string, markIds: string[], required = 1): Leg {
  return {
    id,
    type: 'windward',
    label: id,
    markIds,
    requiredMarks: required,
    rounding: 'port',
  };
}

describe('computeCourseDistance', () => {
  it('returns zero for empty course', () => {
    expect(computeCourseDistance([], [])).toEqual({
      totalMetres: 0,
      perLegMetres: [],
    });
  });

  it('returns zero for a single-leg course', () => {
    const m = mk('a', 52.8, -4.5);
    const out = computeCourseDistance([leg('l1', ['a'])], [m]);
    expect(out.totalMetres).toBe(0);
    expect(out.perLegMetres).toEqual([0]);
  });

  it('sums leg distances between consecutive single-mark legs', () => {
    // Two marks roughly 1 nm apart at Abersoch latitude.
    const a = mk('a', 52.82, -4.5);
    const b = mk('b', 52.8366, -4.5); // ~1.85 km ≈ 1 nm north
    const out = computeCourseDistance(
      [leg('l1', ['a']), leg('l2', ['b'])],
      [a, b],
    );
    expect(out.perLegMetres[0]).toBe(0);
    expect(out.perLegMetres[1]).toBeGreaterThan(1800);
    expect(out.perLegMetres[1]).toBeLessThan(1900);
    expect(out.totalMetres).toBe(out.perLegMetres[1]);
  });

  it('uses midpoint for two-mark legs (start / finish / gate)', () => {
    // Start line: committee boat + pin, 100 m apart.
    const cb = mk('cb', 52.82, -4.5);
    const pin = mk('pin', 52.82, -4.5014); // ~100 m west at this lat
    const wind = mk('wind', 52.8366, -4.5007); // ~1 nm north of midpoint
    const legs: Leg[] = [
      { ...leg('start', ['cb', 'pin'], 2), type: 'start' },
      leg('beat', ['wind']),
    ];
    const out = computeCourseDistance(legs, [cb, pin, wind]);
    // Distance from midpoint of start to wind mark ≈ 1 nm.
    expect(out.perLegMetres[1]).toBeGreaterThan(1800);
    expect(out.perLegMetres[1]).toBeLessThan(1900);
  });

  it('unfilled legs contribute zero', () => {
    const a = mk('a', 52.82, -4.5);
    const c = mk('c', 52.84, -4.5);
    // Middle leg has no marks yet.
    const out = computeCourseDistance(
      [leg('l1', ['a']), leg('l2', []), leg('l3', ['c'])],
      [a, c],
    );
    expect(out.perLegMetres).toEqual([0, 0, 0]);
    expect(out.totalMetres).toBe(0);
  });
});

describe('computeTrackDistance', () => {
  it('returns 0 for zero or one points', () => {
    expect(computeTrackDistance([])).toBe(0);
    expect(computeTrackDistance([{ latitude: 52, longitude: -4 }])).toBe(0);
  });

  it('sums consecutive distances (realistic 1 Hz race track)', () => {
    // At 10 kn = ~5 m per 1-Hz tick. A cluster of 100 points is ~500 m.
    // Build 101 points 0.00005° apart in latitude ≈ 5.5 m per segment.
    const pts = Array.from({ length: 101 }, (_, i) => ({
      latitude: 52.82 + i * 0.00005,
      longitude: -4.5,
    }));
    const d = computeTrackDistance(pts);
    // 100 segments × ~5.5 m ≈ 550 m, well inside the 500 m-per-jump guard.
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(600);
  });

  it('handles a long track via many short segments', () => {
    // 2000 points × ~5 m each ≈ 10 km — representative of a 1-hour race.
    const pts = Array.from({ length: 2001 }, (_, i) => ({
      latitude: 52.82 + i * 0.00005,
      longitude: -4.5,
    }));
    const d = computeTrackDistance(pts);
    expect(d).toBeGreaterThan(10_000);
    expect(d).toBeLessThan(12_000);
  });

  it('ignores jitter under 2 m', () => {
    const pts = [
      { latitude: 52.82, longitude: -4.5 },
      { latitude: 52.82000001, longitude: -4.5 }, // < 2 m
      { latitude: 52.82000002, longitude: -4.5 }, // < 2 m
    ];
    expect(computeTrackDistance(pts)).toBe(0);
  });

  it('rejects jumps over 500 m (signal loss)', () => {
    const pts = [
      { latitude: 52.82, longitude: -4.5 },
      { latitude: 53.0, longitude: -4.5 }, // tens of km — clearly a fresh fix
      { latitude: 53.00005, longitude: -4.5 }, // ~5.5 m valid segment
    ];
    const d = computeTrackDistance(pts);
    expect(d).toBeLessThan(10);
    expect(d).toBeGreaterThan(4);
  });
});

describe('progressPercent', () => {
  it('returns 0 for empty course', () => {
    expect(progressPercent(100, 0)).toBe(0);
  });

  it('clamps at 100% on overshoot', () => {
    expect(progressPercent(2000, 1000)).toBe(100);
  });

  it('computes mid-course correctly', () => {
    expect(progressPercent(500, 1000)).toBe(50);
  });

  it('never returns negative', () => {
    expect(progressPercent(-10, 1000)).toBe(0);
  });
});

describe('metresToNm', () => {
  it('converts exactly', () => {
    expect(metresToNm(1852)).toBe(1);
    expect(metresToNm(926)).toBe(0.5);
    expect(metresToNm(0)).toBe(0);
  });

  it('rounds to two decimals', () => {
    expect(metresToNm(1852 * 1.2345)).toBe(1.23);
  });
});
