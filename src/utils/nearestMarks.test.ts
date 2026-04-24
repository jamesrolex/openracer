import type { Mark } from '../types/mark';

import { sortMarksByDistance } from './nearestMarks';

function mk(id: string, lat: number, lon: number): Mark {
  return {
    id,
    name: id,
    latitude: lat,
    longitude: lon,
    tier: 'club-seasonal',
    source: 'club-library',
    icon: 'custom',
    shape: 'unknown',
    validFrom: null,
    validUntil: null,
    owner: 'Test',
    confidence: 0.9,
  };
}

describe('sortMarksByDistance', () => {
  const far = mk('far', 60, 0);
  const mid = mk('mid', 53, -4);
  const near = mk('near', 52.822, -4.509);

  it('sorts marks by distance from reference', () => {
    const from = { latitude: 52.82, longitude: -4.5 };
    const result = sortMarksByDistance([far, mid, near], from);
    expect(result.map((r) => r.mark.id)).toEqual(['near', 'mid', 'far']);
    expect(result[0]!.distanceMetres).toBeLessThan(result[1]!.distanceMetres);
  });

  it('keeps input order when reference is null', () => {
    const result = sortMarksByDistance([mid, near, far], null);
    expect(result.map((r) => r.mark.id)).toEqual(['mid', 'near', 'far']);
    expect(result[0]!.distanceMetres).toBe(Infinity);
  });

  it('returns empty for empty input', () => {
    expect(sortMarksByDistance([], { latitude: 0, longitude: 0 })).toEqual([]);
  });
});
