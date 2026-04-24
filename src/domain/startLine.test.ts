import {
  computeBoatStartState,
  computeLineBias,
  makeStartLineGeometry,
} from './startLine';

// Start line at Abersoch-ish — CB to east, pin to west, ~200m long, ~52.82°N.
const CB = { latitude: 52.82, longitude: -4.499 };
const PIN = { latitude: 52.82, longitude: -4.502 };

describe('makeStartLineGeometry', () => {
  it('length is ~ the expected metres between the two ends', () => {
    const g = makeStartLineGeometry(CB, PIN);
    expect(g.length).toBeGreaterThan(150);
    expect(g.length).toBeLessThan(260);
  });

  it('bearing is approximately due west (CB → pin)', () => {
    const g = makeStartLineGeometry(CB, PIN);
    expect(g.bearing).toBeGreaterThan(260);
    expect(g.bearing).toBeLessThan(280);
  });

  it('midpoint lies between the two ends', () => {
    const g = makeStartLineGeometry(CB, PIN);
    expect(g.midpoint.latitude).toBeCloseTo(52.82, 5);
    expect(g.midpoint.longitude).toBeCloseTo(-4.5005, 4);
  });
});

describe('computeBoatStartState — pre-start side', () => {
  it('boat north of the line is ahead (pre-start) and positive distance', () => {
    const boat = { latitude: 52.821, longitude: -4.5005 }; // 111m north
    const r = computeBoatStartState(boat, 180, 3, CB, PIN);
    expect(r.side).toBe('ahead');
    expect(r.distanceMetres).toBeGreaterThan(100);
    expect(r.distanceMetres).toBeLessThan(130);
  });

  it('boat south of the line is behind (OCS) and negative distance', () => {
    const boat = { latitude: 52.819, longitude: -4.5005 }; // 111m south
    const r = computeBoatStartState(boat, 0, 3, CB, PIN);
    expect(r.side).toBe('behind');
    expect(r.distanceMetres).toBeLessThan(-100);
  });

  it('boat on the line shows zero distance', () => {
    const boat = { latitude: 52.82, longitude: -4.5005 };
    const r = computeBoatStartState(boat, 180, 3, CB, PIN);
    expect(r.side).toBe('on-line');
    expect(Math.abs(r.distanceMetres)).toBeLessThan(1);
  });
});

describe('computeBoatStartState — time to line', () => {
  it('heading at the line from 100m out at 5kn (~2.57 m/s) → ~39s', () => {
    // 111m north of line, heading 180° (south), SOG 2.57 m/s.
    const boat = { latitude: 52.821, longitude: -4.5005 };
    const r = computeBoatStartState(boat, 180, 2.57, CB, PIN);
    expect(r.secondsToLine).not.toBeNull();
    if (r.secondsToLine !== null) {
      expect(r.secondsToLine).toBeGreaterThan(35);
      expect(r.secondsToLine).toBeLessThan(55);
    }
  });

  it('stationary boat → null time-to-line', () => {
    const boat = { latitude: 52.821, longitude: -4.5005 };
    const r = computeBoatStartState(boat, 180, 0, CB, PIN);
    expect(r.secondsToLine).toBeNull();
  });

  it('moving away from line → null time-to-line', () => {
    const boat = { latitude: 52.821, longitude: -4.5005 };
    const r = computeBoatStartState(boat, 0, 3, CB, PIN); // moving north, away
    expect(r.secondsToLine).toBeNull();
  });
});

describe('computeLineBias', () => {
  // Line is ~ bearing 270° (CB east, pin west). Perpendicular-to-line
  // going upwind would be bearing 180° (south). So a wind from TWD=180°
  // is square; TWD > 180° rotates clockwise → CB end favoured.
  it('square line with wind perpendicular → neutral', () => {
    const b = computeLineBias(CB, PIN, 180);
    expect(b.favoured).toBe('neutral');
    expect(Math.abs(b.degrees)).toBeLessThan(3);
  });

  it('wind backed towards CB end (clockwise from 180) → CB favoured', () => {
    const b = computeLineBias(CB, PIN, 195);
    expect(b.favoured).toBe('committee');
    expect(b.degrees).toBeGreaterThan(0);
  });

  it('wind veered towards pin (counterclockwise from 180) → pin favoured', () => {
    const b = computeLineBias(CB, PIN, 165);
    expect(b.favoured).toBe('pin');
    expect(b.degrees).toBeLessThan(0);
  });
});
