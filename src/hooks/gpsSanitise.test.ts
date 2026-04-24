import { sanitiseGPSReading } from './gpsSanitise';

/**
 * Regression guard for B-001. iOS CLLocation returns -1 for speed and
 * course when the value cannot be reliably measured (typically stationary).
 * The sanitiser must pass these through as null.
 */
describe('sanitiseGPSReading', () => {
  const abersochTimestamp = Date.UTC(2026, 3, 24, 6, 20, 13, 485);

  it('passes a valid moving reading through intact', () => {
    const out = sanitiseGPSReading(
      { latitude: 52.82263, longitude: -4.50969, speed: 3.2, heading: 145, accuracy: 5 },
      abersochTimestamp,
    );
    expect(out.position).toEqual({ latitude: 52.82263, longitude: -4.50969 });
    expect(out.sog).toBe(3.2);
    expect(out.cog).toBe(145);
    expect(out.heading).toBe(145);
    expect(out.accuracy).toBe(5);
    expect(out.lastUpdate).toBe('2026-04-24T06:20:13.485Z');
  });

  it('treats negative speed as invalid (iOS stationary)', () => {
    const out = sanitiseGPSReading(
      { latitude: 52.82263, longitude: -4.50969, speed: -1, heading: 180, accuracy: 7 },
      abersochTimestamp,
    );
    expect(out.sog).toBeNull();
    expect(out.cog).toBe(180);
    expect(out.heading).toBe(180);
  });

  it('treats negative heading as invalid (iOS stationary)', () => {
    const out = sanitiseGPSReading(
      { latitude: 52.82263, longitude: -4.50969, speed: 2, heading: -1, accuracy: 7 },
      abersochTimestamp,
    );
    expect(out.sog).toBe(2);
    expect(out.cog).toBeNull();
    expect(out.heading).toBeNull();
  });

  it('treats both negative as both invalid — the B-001 stationary case', () => {
    const out = sanitiseGPSReading(
      { latitude: 52.82263, longitude: -4.50969, speed: -1, heading: -1, accuracy: 7 },
      abersochTimestamp,
    );
    expect(out.sog).toBeNull();
    expect(out.cog).toBeNull();
    expect(out.heading).toBeNull();
    // Position and accuracy are still valid — the fix is good.
    expect(out.position).toEqual({ latitude: 52.82263, longitude: -4.50969 });
    expect(out.accuracy).toBe(7);
  });

  it('treats null speed / heading as invalid', () => {
    const out = sanitiseGPSReading(
      { latitude: 0, longitude: 0, speed: null, heading: null, accuracy: null },
      abersochTimestamp,
    );
    expect(out.sog).toBeNull();
    expect(out.cog).toBeNull();
    expect(out.heading).toBeNull();
    expect(out.accuracy).toBeNull();
  });

  it('accepts zero speed — stationary but measured, which is different from invalid', () => {
    const out = sanitiseGPSReading(
      { latitude: 0, longitude: 0, speed: 0, heading: 0, accuracy: 3 },
      abersochTimestamp,
    );
    expect(out.sog).toBe(0);
    expect(out.cog).toBe(0);
    expect(out.heading).toBe(0);
  });
});
