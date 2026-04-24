import type { GeoPosition } from '../types/signalk';
import {
  EARTH_RADIUS_METRES,
  bearingBetween,
  destinationPoint,
  distanceBetween,
} from './geo';

const abersoch: GeoPosition = { latitude: 52.8205, longitude: -4.5025 };
const pwllheli: GeoPosition = { latitude: 52.888, longitude: -4.413 };

describe('distanceBetween', () => {
  it('returns zero for identical points', () => {
    expect(distanceBetween(abersoch, abersoch)).toBe(0);
  });

  it('matches a known separation on a short real-world leg', () => {
    // Abersoch YC → Pwllheli harbour entrance is ~9.6 km great-circle.
    // Loose bounds to stay tolerant of spherical-model drift.
    const metres = distanceBetween(abersoch, pwllheli);
    expect(metres).toBeGreaterThan(9000);
    expect(metres).toBeLessThan(10_000);
  });

  it('is symmetric — order of arguments does not change distance', () => {
    expect(distanceBetween(abersoch, pwllheli)).toBeCloseTo(
      distanceBetween(pwllheli, abersoch),
      6,
    );
  });

  it('handles antimeridian crossings correctly', () => {
    const a: GeoPosition = { latitude: 0, longitude: 179.5 };
    const b: GeoPosition = { latitude: 0, longitude: -179.5 };
    const metres = distanceBetween(a, b);
    // One degree of longitude at the equator is ~111 km.
    expect(metres).toBeGreaterThan(110_000);
    expect(metres).toBeLessThan(112_000);
  });

  it('handles polar distances (equator to north pole = πR/2)', () => {
    const equator: GeoPosition = { latitude: 0, longitude: 0 };
    const northPole: GeoPosition = { latitude: 90, longitude: 0 };
    const expected = (Math.PI / 2) * EARTH_RADIUS_METRES;
    expect(distanceBetween(equator, northPole)).toBeCloseTo(expected, 0);
  });

  it('handles negative coordinates symmetrically', () => {
    const northish: GeoPosition = { latitude: 1, longitude: 1 };
    const southish: GeoPosition = { latitude: -1, longitude: -1 };
    const mirror = distanceBetween(
      { latitude: -northish.latitude, longitude: -northish.longitude },
      { latitude: -southish.latitude, longitude: -southish.longitude },
    );
    expect(distanceBetween(northish, southish)).toBeCloseTo(mirror, 6);
  });
});

describe('bearingBetween', () => {
  it('returns 0 for identical points (degenerate case)', () => {
    expect(bearingBetween(abersoch, abersoch)).toBe(0);
  });

  it('returns 0° going due north from the equator', () => {
    expect(
      bearingBetween({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 }),
    ).toBeCloseTo(0, 6);
  });

  it('returns 90° going due east along the equator', () => {
    expect(
      bearingBetween({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }),
    ).toBeCloseTo(90, 6);
  });

  it('returns 180° going due south', () => {
    expect(
      bearingBetween({ latitude: 1, longitude: 0 }, { latitude: -1, longitude: 0 }),
    ).toBeCloseTo(180, 6);
  });

  it('returns 270° going due west along the equator', () => {
    expect(
      bearingBetween({ latitude: 0, longitude: 1 }, { latitude: 0, longitude: 0 }),
    ).toBeCloseTo(270, 6);
  });

  it('is always in the [0, 360) range even for westward crossings of the meridian', () => {
    const bearing = bearingBetween(
      { latitude: 52, longitude: 1 },
      { latitude: 52, longitude: -1 },
    );
    expect(bearing).toBeGreaterThanOrEqual(0);
    expect(bearing).toBeLessThan(360);
  });

  it('handles the antimeridian crossing', () => {
    const bearing = bearingBetween(
      { latitude: 0, longitude: 179 },
      { latitude: 0, longitude: -179 },
    );
    expect(bearing).toBeCloseTo(90, 1);
  });
});

describe('destinationPoint', () => {
  it('returns the start for zero distance', () => {
    const dest = destinationPoint(abersoch, 90, 0);
    expect(dest.latitude).toBeCloseTo(abersoch.latitude, 10);
    expect(dest.longitude).toBeCloseTo(abersoch.longitude, 10);
  });

  it('round-trips: destination of (bearing, d) then distance back equals d', () => {
    const dest = destinationPoint(abersoch, 45, 5000);
    const back = distanceBetween(abersoch, dest);
    expect(back).toBeCloseTo(5000, 0);
  });

  it('going due east moves only longitude at the equator', () => {
    const dest = destinationPoint({ latitude: 0, longitude: 0 }, 90, 111_320);
    expect(dest.latitude).toBeCloseTo(0, 6);
    expect(dest.longitude).toBeCloseTo(1, 1);
  });

  it('going due north moves only latitude', () => {
    const dest = destinationPoint({ latitude: 0, longitude: 0 }, 0, 111_320);
    expect(dest.latitude).toBeCloseTo(1, 1);
    expect(dest.longitude).toBeCloseTo(0, 6);
  });

  it('wraps longitude across the antimeridian (from +179.9 east → negative)', () => {
    const dest = destinationPoint({ latitude: 0, longitude: 179.9 }, 90, 50_000);
    expect(dest.longitude).toBeLessThan(0);
    expect(dest.longitude).toBeGreaterThan(-180);
  });

  it('normalises exactly -180° longitude to +180°', () => {
    // Build a trip that lands precisely on ±180. Travelling 180° of longitude
    // along the equator from lon=0 bearing east = 180° of the circumference.
    const dest = destinationPoint(
      { latitude: 0, longitude: 0 },
      90,
      Math.PI * EARTH_RADIUS_METRES,
    );
    expect(dest.longitude).toBe(180);
  });
});
