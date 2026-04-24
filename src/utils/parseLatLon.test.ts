import { parseCoordinate, parseLatLon } from './parseLatLon';

describe('parseCoordinate — DMM forgiving input', () => {
  it('accepts plain "52 49.230 N"', () => {
    expect(parseCoordinate('52 49.230 N', 'lat')).toBeCloseTo(52.8205, 4);
  });

  it('accepts full marine form "52° 49.230\' N"', () => {
    expect(parseCoordinate("52° 49.230' N", 'lat')).toBeCloseTo(52.8205, 4);
  });

  it('accepts colon-separated "52:49.230N"', () => {
    expect(parseCoordinate('52:49.230N', 'lat')).toBeCloseTo(52.8205, 4);
  });

  it('accepts hyphen/dash variants and concatenated hemisphere', () => {
    expect(parseCoordinate('52-49.230N', 'lat')).toBeCloseTo(52.8205, 4);
  });
});

describe('parseCoordinate — decimal input', () => {
  it('parses positive decimal with no hemisphere', () => {
    expect(parseCoordinate('52.8205', 'lat')).toBeCloseTo(52.8205, 4);
  });

  it('parses negative decimal as southern/western', () => {
    expect(parseCoordinate('-4.5025', 'lon')).toBeCloseTo(-4.5025, 4);
  });

  it('hemisphere S makes positive decimal southern', () => {
    expect(parseCoordinate('34.12 S', 'lat')).toBeCloseTo(-34.12, 4);
  });

  it('hemisphere W makes positive decimal western', () => {
    expect(parseCoordinate('4.5025 W', 'lon')).toBeCloseTo(-4.5025, 4);
  });

  it('accepts "° N" suffix on a decimal', () => {
    expect(parseCoordinate('52.8205° N', 'lat')).toBeCloseTo(52.8205, 4);
  });
});

describe('parseCoordinate — DMS input', () => {
  it("accepts full DMS \"52° 49' 13.8\\\" N\"", () => {
    const v = parseCoordinate('52° 49\' 13.8" N', 'lat');
    expect(v).toBeCloseTo(52 + 49 / 60 + 13.8 / 3600, 6);
  });

  it('accepts DMS without symbols "52 49 13.8 N"', () => {
    const v = parseCoordinate('52 49 13.8 N', 'lat');
    expect(v).toBeCloseTo(52 + 49 / 60 + 13.8 / 3600, 6);
  });
});

describe('parseCoordinate — errors', () => {
  it('rejects empty input', () => {
    expect(() => parseCoordinate('', 'lat')).toThrow(/empty/i);
    expect(() => parseCoordinate('   ', 'lat')).toThrow(/empty/i);
  });

  it('rejects mismatched hemisphere for axis', () => {
    expect(() => parseCoordinate('52.8 E', 'lat')).toThrow(/hemisphere/i);
    expect(() => parseCoordinate('4.5 N', 'lon')).toThrow(/hemisphere/i);
  });

  it('rejects minutes out of range', () => {
    expect(() => parseCoordinate('52 61.0 N', 'lat')).toThrow(/minutes/i);
  });

  it('rejects seconds out of range', () => {
    expect(() => parseCoordinate('52 49 60.0 N', 'lat')).toThrow(/seconds/i);
  });

  it('rejects latitude out of range', () => {
    expect(() => parseCoordinate('95.0 N', 'lat')).toThrow(/between/i);
  });

  it('rejects longitude out of range', () => {
    expect(() => parseCoordinate('185.0 W', 'lon')).toThrow(/between/i);
  });

  it('rejects conflicting negative sign and northern hemisphere', () => {
    expect(() => parseCoordinate('-52.8 N', 'lat')).toThrow(/pick one/i);
  });

  it('rejects non-numeric garbage', () => {
    expect(() => parseCoordinate('five degrees', 'lat')).toThrow();
  });
});

describe('parseLatLon — paired input', () => {
  it('splits on comma', () => {
    const r = parseLatLon('52.8205, -4.5025');
    expect(r.latitude).toBeCloseTo(52.8205, 4);
    expect(r.longitude).toBeCloseTo(-4.5025, 4);
  });

  it('splits on semicolon', () => {
    const r = parseLatLon('52° 49.230\' N; 4° 30.150\' W');
    expect(r.latitude).toBeCloseTo(52.8205, 4);
    expect(r.longitude).toBeCloseTo(-4.5025, 4);
  });

  it('splits on newline', () => {
    const r = parseLatLon('52.8205 N\n4.5025 W');
    expect(r.latitude).toBeCloseTo(52.8205, 4);
    expect(r.longitude).toBeCloseTo(-4.5025, 4);
  });

  it('rejects single value', () => {
    expect(() => parseLatLon('52.8205')).toThrow(/two/i);
  });

  it('rejects three values', () => {
    expect(() => parseLatLon('52, -4, 0')).toThrow(/two/i);
  });
});
