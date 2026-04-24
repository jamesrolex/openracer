import { describeTriangulateError, triangulate } from './triangulate';

// Reference fixture: mark ~200m north of two observers at (52.820, -4.500)
// and (52.820, -4.5025). From A (east) the bearing to the mark (north of
// east observer) is slightly west of north. From B (west) it's slightly
// east of north.
describe('triangulate', () => {
  it('crosses correctly for two perpendicular-ish sightings', () => {
    const a = {
      position: { latitude: 52.820, longitude: -4.500 },
      bearing: 330, // looking northwest-ish
    };
    const b = {
      position: { latitude: 52.820, longitude: -4.5025 },
      bearing: 30, // looking northeast-ish
    };
    const r = triangulate(a, b);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.target.latitude).toBeGreaterThan(52.820);
    expect(r.target.longitude).toBeCloseTo(-4.50125, 3);
    expect(r.accuracyMetres).toBeGreaterThan(0);
  });

  it('rejects near-parallel bearings', () => {
    const a = {
      position: { latitude: 52.820, longitude: -4.500 },
      bearing: 10,
    };
    const b = {
      position: { latitude: 52.820, longitude: -4.5025 },
      bearing: 12,
    };
    const r = triangulate(a, b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('bearings-parallel');
  });

  it('rejects when intersection is behind one observer', () => {
    const a = {
      position: { latitude: 52.820, longitude: -4.500 },
      bearing: 30, // looking NE
    };
    const b = {
      position: { latitude: 52.820, longitude: -4.5025 },
      bearing: 330, // looking NW
    };
    // Both looking away from each other → intersection is behind both
    const r = triangulate(a, b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('intersection-behind');
  });

  it('rejects identical observation positions', () => {
    const a = {
      position: { latitude: 52.820, longitude: -4.500 },
      bearing: 10,
    };
    const b = {
      position: { latitude: 52.820, longitude: -4.500 },
      bearing: 20,
    };
    const r = triangulate(a, b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('positions-identical');
  });

  it('accuracy grows as bearings approach parallel', () => {
    const base = { latitude: 52.820, longitude: -4.500 };
    const moved = { latitude: 52.820, longitude: -4.5025 };
    const wideCross = triangulate(
      { position: base, bearing: 330 },
      { position: moved, bearing: 30 },
    );
    const narrowCross = triangulate(
      { position: base, bearing: 10 },
      { position: moved, bearing: 15 },
    );
    if (!wideCross.ok || !narrowCross.ok) throw new Error('setup fail');
    expect(narrowCross.accuracyMetres).toBeGreaterThan(wideCross.accuracyMetres);
  });

  it('describeTriangulateError returns human-readable messages', () => {
    expect(describeTriangulateError({ kind: 'bearings-parallel', angleDeg: 2 })).toMatch(/too close/);
    expect(describeTriangulateError({ kind: 'intersection-behind' })).toMatch(/wrong way/);
    expect(describeTriangulateError({ kind: 'positions-identical' })).toMatch(/haven/);
  });
});
