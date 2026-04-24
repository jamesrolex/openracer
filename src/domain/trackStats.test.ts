import type { TrackPoint } from '../stores/raceSessionsRepo';

import { computeTrackStats, formatDuration } from './trackStats';

function pt(
  id: number,
  recordedAt: string,
  lat: number,
  lon: number,
  sog: number | null = null,
): TrackPoint {
  return {
    id,
    sessionId: 's',
    recordedAt,
    latitude: lat,
    longitude: lon,
    sog,
    cog: null,
    heading: null,
    accuracy: null,
  };
}

describe('computeTrackStats', () => {
  it('empty input returns zero stats', () => {
    const s = computeTrackStats([]);
    expect(s.pointCount).toBe(0);
    expect(s.distanceMetres).toBe(0);
    expect(s.durationSeconds).toBe(0);
    expect(s.boundingBox).toBeNull();
    expect(s.maxSogKnots).toBeNull();
  });

  it('single point has a point count but no distance / bbox', () => {
    const s = computeTrackStats([pt(1, '2026-04-24T18:45:00Z', 52.8, -4.5, 3.0)]);
    expect(s.pointCount).toBe(1);
    expect(s.distanceMetres).toBe(0);
    expect(s.durationSeconds).toBe(0);
    expect(s.boundingBox).toBeNull();
    expect(s.maxSogKnots).not.toBeNull();
  });

  it('two points give a realistic distance + duration', () => {
    const s = computeTrackStats([
      pt(1, '2026-04-24T18:45:00Z', 52.8, -4.5, 2.5),
      pt(2, '2026-04-24T18:45:30Z', 52.801, -4.5, 2.8),
    ]);
    // ~111m between those two latitudes
    expect(s.distanceMetres).toBeGreaterThan(100);
    expect(s.distanceMetres).toBeLessThan(120);
    expect(s.durationSeconds).toBe(30);
    expect(s.maxSogKnots).toBeCloseTo(2.8 / 0.5144, 1);
    expect(s.averageSogKnots).toBeCloseTo((2.5 + 2.8) / 2 / 0.5144, 1);
    expect(s.boundingBox).toEqual({
      minLat: 52.8,
      maxLat: 52.801,
      minLon: -4.5,
      maxLon: -4.5,
    });
  });

  it('skips invalid sog samples (negative / non-finite)', () => {
    const s = computeTrackStats([
      pt(1, '2026-04-24T18:45:00Z', 52.8, -4.5, -1), // invalid
      pt(2, '2026-04-24T18:45:30Z', 52.801, -4.5, 3.0),
      pt(3, '2026-04-24T18:46:00Z', 52.802, -4.5, null),
    ]);
    expect(s.maxSogKnots).toBeCloseTo(3.0 / 0.5144, 1);
    expect(s.averageSogKnots).toBeCloseTo(3.0 / 0.5144, 1);
  });

  it('bounding box captures the extremes', () => {
    const s = computeTrackStats([
      pt(1, '2026-04-24T18:45:00Z', 52.8, -4.5),
      pt(2, '2026-04-24T18:45:30Z', 52.9, -4.4),
      pt(3, '2026-04-24T18:46:00Z', 52.85, -4.6),
    ]);
    expect(s.boundingBox).toEqual({
      minLat: 52.8,
      maxLat: 52.9,
      minLon: -4.6,
      maxLon: -4.4,
    });
  });
});

describe('formatDuration', () => {
  it('sub-hour uses MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(61)).toBe('01:01');
    expect(formatDuration(3599)).toBe('59:59');
  });
  it('over an hour uses H:MM:SS', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
  });
  it('clamps negatives', () => {
    expect(formatDuration(-10)).toBe('00:00');
  });
});
