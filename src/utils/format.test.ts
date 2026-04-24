import {
  METRES_PER_NAUTICAL_MILE,
  METRES_PER_SECOND_PER_KNOT,
  formatBearing,
  formatDistance,
  formatLatLon,
  knotsToMetresPerSecond,
  metresPerSecondToKnots,
} from './format';

describe('metresPerSecondToKnots / knotsToMetresPerSecond', () => {
  it('converts zero without drift', () => {
    expect(metresPerSecondToKnots(0)).toBe(0);
    expect(knotsToMetresPerSecond(0)).toBe(0);
  });

  it('round-trips to the input within float tolerance', () => {
    const original = 7.3;
    const roundTripped = knotsToMetresPerSecond(metresPerSecondToKnots(original));
    expect(roundTripped).toBeCloseTo(original, 10);
  });

  it('matches the SignalK-native conversion constant', () => {
    expect(metresPerSecondToKnots(1)).toBeCloseTo(1 / METRES_PER_SECOND_PER_KNOT, 10);
    expect(knotsToMetresPerSecond(1)).toBeCloseTo(METRES_PER_SECOND_PER_KNOT, 10);
  });

  it('handles negative speeds (rare but possible — astern)', () => {
    expect(metresPerSecondToKnots(-1)).toBeCloseTo(-1.9438, 3);
  });
});

describe('formatDistance', () => {
  it('formats metres as rounded integer with unit', () => {
    expect(formatDistance(150, 'm')).toBe('150 m');
    expect(formatDistance(150.6, 'm')).toBe('151 m');
  });

  it('formats kilometres to two decimals', () => {
    expect(formatDistance(1234, 'km')).toBe('1.23 km');
  });

  it('formats nautical miles to two decimals using 1852 m definition', () => {
    expect(formatDistance(METRES_PER_NAUTICAL_MILE, 'nm')).toBe('1.00 nm');
    expect(formatDistance(METRES_PER_NAUTICAL_MILE / 2, 'nm')).toBe('0.50 nm');
  });

  it('treats negative distances as absolute', () => {
    expect(formatDistance(-100, 'm')).toBe('100 m');
    expect(formatDistance(-1852, 'nm')).toBe('1.00 nm');
  });

  it('formats zero correctly in every unit', () => {
    expect(formatDistance(0, 'm')).toBe('0 m');
    expect(formatDistance(0, 'km')).toBe('0.00 km');
    expect(formatDistance(0, 'nm')).toBe('0.00 nm');
  });
});

describe('formatBearing', () => {
  it('rounds to integer degrees with the degree sign', () => {
    expect(formatBearing(270)).toBe('270°');
    expect(formatBearing(270.4)).toBe('270°');
    expect(formatBearing(270.6)).toBe('271°');
  });

  it('normalises negative values into [0, 360)', () => {
    expect(formatBearing(-10)).toBe('350°');
    expect(formatBearing(-370)).toBe('350°');
  });

  it('normalises values at or above 360', () => {
    expect(formatBearing(360)).toBe('0°');
    expect(formatBearing(370)).toBe('10°');
    expect(formatBearing(720.5)).toBe('1°');
  });

  it('formats zero as "0°"', () => {
    expect(formatBearing(0)).toBe('0°');
  });
});

describe('formatLatLon', () => {
  const abersoch = { lat: 52.8205, lon: -4.5025 };

  it('formats a northern + western coordinate in DMM by default marine convention', () => {
    expect(formatLatLon(abersoch.lat, abersoch.lon, 'dmm')).toBe(
      "52° 49.230' N, 004° 30.150' W",
    );
  });

  it('formats decimal with hemisphere letters and 4 decimals (no zero-pad)', () => {
    expect(formatLatLon(abersoch.lat, abersoch.lon, 'decimal')).toBe(
      '52.8205° N, 4.5025° W',
    );
  });

  it('formats DMS with integer minutes and 1-decimal seconds', () => {
    expect(formatLatLon(abersoch.lat, abersoch.lon, 'dms')).toBe(
      '52° 49\' 13.8" N, 004° 30\' 09.0" W',
    );
  });

  it('uses S for negative latitudes and E for positive longitudes', () => {
    expect(formatLatLon(-33.8688, 151.2093, 'dmm')).toBe(
      "33° 52.128' S, 151° 12.558' E",
    );
  });

  it('handles the equator and prime meridian (zero values)', () => {
    expect(formatLatLon(0, 0, 'dmm')).toBe("00° 00.000' N, 000° 00.000' E");
    expect(formatLatLon(0, 0, 'decimal')).toBe('0.0000° N, 0.0000° E');
    expect(formatLatLon(0, 0, 'dms')).toBe('00° 00\' 00.0" N, 000° 00\' 00.0" E');
  });

  it('handles the poles', () => {
    expect(formatLatLon(90, 0, 'dmm')).toBe("90° 00.000' N, 000° 00.000' E");
    expect(formatLatLon(-90, 0, 'dmm')).toBe("90° 00.000' S, 000° 00.000' E");
  });

  it('handles longitude near the antimeridian', () => {
    expect(formatLatLon(0, 179.99, 'decimal')).toBe('0.0000° N, 179.9900° E');
    expect(formatLatLon(0, -179.99, 'decimal')).toBe('0.0000° N, 179.9900° W');
  });
});
