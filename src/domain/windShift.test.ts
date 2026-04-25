import {
  angularSpread,
  computeShift,
  isTackEvent,
  medianDegrees,
  signedDelta,
  type CogSample,
} from './windShift';

function s(at: string, cog: number, sog = 5): CogSample {
  return { at, cogDegrees: cog, sogMps: sog };
}

describe('signedDelta', () => {
  it('zero when equal', () => {
    expect(signedDelta(45, 45)).toBe(0);
  });
  it('positive shift to the right of baseline', () => {
    expect(signedDelta(45, 50)).toBe(5);
  });
  it('negative when stepping back', () => {
    expect(signedDelta(50, 45)).toBe(-5);
  });
  it('handles 0/360 wrap to the left', () => {
    expect(signedDelta(355, 5)).toBe(10);
  });
  it('handles 0/360 wrap to the right', () => {
    expect(signedDelta(5, 355)).toBe(-10);
  });
});

describe('medianDegrees', () => {
  it('median of three close headings', () => {
    expect(medianDegrees([45, 47, 50])).toBeCloseTo(47, 5);
  });
  it('handles wrap around 0/360', () => {
    const m = medianDegrees([350, 355, 5, 10]);
    // median should be near 0 after wrap-correct
    expect(Math.abs(signedDelta(0, m))).toBeLessThan(5);
  });
});

describe('angularSpread', () => {
  it('zero for single value', () => {
    expect(angularSpread([45])).toBe(0);
  });
  it('measures simple spread', () => {
    expect(angularSpread([45, 50, 55])).toBe(10);
  });
  it('handles wrap', () => {
    expect(angularSpread([355, 5, 10])).toBe(15);
  });
});

describe('computeShift', () => {
  const baseline = 45;

  it('unavailable when no baseline', () => {
    const out = computeShift([], null);
    expect(out.quality).toBe('unavailable');
  });

  it('unavailable when fewer than min samples', () => {
    const out = computeShift([s('t1', 45)], baseline);
    expect(out.quality).toBe('unavailable');
  });

  it('reports a small lift (positive shift) on stable port-tack data', () => {
    const samples = [
      s('t1', 50),
      s('t2', 51),
      s('t3', 52),
      s('t4', 51),
      s('t5', 50),
    ];
    const out = computeShift(samples, baseline);
    expect(out.quality).toBe('good');
    expect(out.shiftDegrees).toBeGreaterThan(3);
    expect(out.shiftDegrees).toBeLessThan(10);
    expect(out.currentTack).toBe('port');
  });

  it('reports a header (negative shift) when COG falls below baseline', () => {
    const samples = [
      s('t1', 40),
      s('t2', 39),
      s('t3', 41),
      s('t4', 40),
      s('t5', 38),
    ];
    const out = computeShift(samples, baseline);
    expect(out.shiftDegrees).toBeLessThan(0);
    expect(out.currentTack).toBe('starboard');
  });

  it('flags low quality when the recent window is wide', () => {
    const samples = [
      s('t1', 30),
      s('t2', 60),
      s('t3', 35),
      s('t4', 55),
      s('t5', 40),
    ];
    const out = computeShift(samples, baseline);
    expect(out.quality).toBe('low');
  });

  it('drops stationary samples (sog < 0.5 m/s)', () => {
    const samples = [
      s('t1', 40, 0.1),
      s('t2', 60, 0.0),
      s('t3', 50, 5),
      s('t4', 51, 5),
      s('t5', 50, 5),
      s('t6', 49, 5),
      s('t7', 51, 5),
    ];
    const out = computeShift(samples, baseline);
    expect(out.quality).toBe('good');
    expect(out.shiftDegrees).toBeGreaterThan(3);
  });
});

describe('isTackEvent', () => {
  it('false on a stable run', () => {
    const samples = [s('1', 45), s('2', 46), s('3', 44), s('4', 45)];
    expect(isTackEvent(samples)).toBe(false);
  });
  it('true when latest COG flips by > 60°', () => {
    const samples = [s('1', 45), s('2', 46), s('3', 44), s('4', 220)];
    expect(isTackEvent(samples)).toBe(true);
  });
  it('false when not enough history', () => {
    const samples = [s('1', 45), s('2', 220)];
    expect(isTackEvent(samples)).toBe(false);
  });
});
