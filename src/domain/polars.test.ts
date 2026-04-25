import {
  BUILTIN_POLARS,
  evaluatePolar,
  parsePolarTable,
} from './polars';

describe('parsePolarTable', () => {
  it('parses the J/24 built-in', () => {
    const out = parsePolarTable(BUILTIN_POLARS[0]!.raw);
    expect(out.ok).toBe(true);
    const table = out.table!;
    expect(table.twsBinsKn).toEqual([6, 8, 10, 12, 16, 20]);
    expect(table.twaBinsDeg[0]).toBe(32);
    expect(table.twaBinsDeg[table.twaBinsDeg.length - 1]).toBe(180);
    expect(table.targetSpeedKn.length).toBe(
      table.twsBinsKn.length * table.twaBinsDeg.length,
    );
  });

  it('rejects a header row with no TWS bins', () => {
    const out = parsePolarTable('twa/tws\n40 5.0');
    expect(out.ok).toBe(false);
  });

  it('rejects a row with the wrong cell count', () => {
    const out = parsePolarTable('twa/tws 6 8\n40 5.0');
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/expected 3/);
  });

  it('rejects non-numeric speeds', () => {
    const out = parsePolarTable('twa/tws 6 8\n40 5.0 fast');
    expect(out.ok).toBe(false);
  });

  it('sorts unsorted TWA rows ascending', () => {
    const raw = `twa/tws 6 8
180     3.60  4.60
40      4.60  5.50
90      5.20  6.00`;
    const out = parsePolarTable(raw);
    expect(out.ok).toBe(true);
    expect(out.table!.twaBinsDeg).toEqual([40, 90, 180]);
  });
});

describe('evaluatePolar', () => {
  const table = parsePolarTable(BUILTIN_POLARS[0]!.raw).table!;

  it('returns the exact bin value for a grid hit', () => {
    expect(evaluatePolar(table, 10, 90)).toBeCloseTo(6.5, 5);
  });

  it('interpolates between TWS bins', () => {
    // J/24 at 9 kn TWS, 90° TWA: between 6.0 (at 8 kn) and 6.5 (at 10 kn) → 6.25
    const v = evaluatePolar(table, 9, 90);
    expect(v).toBeGreaterThan(6.0);
    expect(v).toBeLessThan(6.5);
  });

  it('interpolates between TWA bins', () => {
    // J/24 at 10 kn TWS, 75° TWA: between 6.0 (60°) and 6.5 (90°)
    const v = evaluatePolar(table, 10, 75);
    expect(v).toBeGreaterThan(6.0);
    expect(v).toBeLessThan(6.5);
  });

  it('clamps below the minimum TWS', () => {
    const low = evaluatePolar(table, 2, 90);
    const min = evaluatePolar(table, 6, 90);
    expect(low).toBeCloseTo(min, 5);
  });

  it('clamps above the maximum TWS', () => {
    const high = evaluatePolar(table, 50, 90);
    const max = evaluatePolar(table, 20, 90);
    expect(high).toBeCloseTo(max, 5);
  });

  it('mirrors broad-reach TWA past 180°', () => {
    // 200° TWA should be treated as 160° (= 360 - 200).
    expect(evaluatePolar(table, 10, 200)).toBeCloseTo(
      evaluatePolar(table, 10, 160),
      5,
    );
  });
});
