import { formatCountdown, makeSnapshot, syncToNextWholeMinute } from './raceTimer';

const gun = new Date('2026-04-24T18:45:00Z');
const at = (iso: string): Date => new Date(iso);

describe('makeSnapshot', () => {
  it('idle when no sequenceStartTime', () => {
    const snap = makeSnapshot(null, at('2026-04-24T18:00:00Z'));
    expect(snap.state).toBe('idle');
    expect(snap.band).toBe('dormant');
    expect(snap.nextSignal).toBeNull();
  });

  it('armed before the warning signal fires', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:39:00Z'));
    expect(snap.state).toBe('armed');
    expect(snap.band).toBe('dormant');
    expect(snap.nextSignal).toBe('warning');
    expect(snap.lastSignal).toBeNull();
    expect(snap.secondsToStart).toBe(360);
  });

  it('counting down at T-5 when warning fires', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:40:00Z'));
    expect(snap.state).toBe('counting-down');
    expect(snap.band).toBe('preparing');
    expect(snap.lastSignal).toBe('warning');
    expect(snap.nextSignal).toBe('preparatory');
    expect(snap.secondsToStart).toBe(300);
  });

  it('still preparing band through T-2', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:43:00Z'));
    expect(snap.state).toBe('counting-down');
    expect(snap.band).toBe('preparing');
    expect(snap.lastSignal).toBe('preparatory');
  });

  it('urgent band in the last minute', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:44:01Z'));
    expect(snap.state).toBe('counting-down');
    expect(snap.band).toBe('urgent');
    expect(snap.lastSignal).toBe('one-minute');
  });

  it('starting state at the gun', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:45:00Z'));
    expect(snap.state).toBe('starting');
    expect(snap.band).toBe('live');
    expect(snap.lastSignal).toBe('start');
    expect(snap.secondsToStart).toBe(0);
  });

  it('transitions to running shortly after the gun', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:45:05Z'));
    expect(snap.state).toBe('running');
    expect(snap.band).toBe('after');
    expect(snap.secondsToStart).toBe(-5);
  });

  it('finishes after the 6-hour cap', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-25T01:00:00Z'));
    expect(snap.state).toBe('finished');
  });
});

describe('syncToNextWholeMinute', () => {
  it('rounds up when mid-minute', () => {
    const armed = at('2026-04-24T18:42:17Z');
    const synced = syncToNextWholeMinute(armed);
    expect(synced.toISOString()).toBe('2026-04-24T18:43:00.000Z');
  });

  it('leaves whole-minute times alone', () => {
    const armed = at('2026-04-24T18:42:00Z');
    const synced = syncToNextWholeMinute(armed);
    expect(synced.toISOString()).toBe('2026-04-24T18:42:00.000Z');
  });
});

describe('formatCountdown', () => {
  it('negative zero edge', () => {
    expect(formatCountdown(0)).toBe('T-00:00');
  });
  it('whole minutes', () => {
    expect(formatCountdown(300)).toBe('T-05:00');
  });
  it('sub-minute', () => {
    expect(formatCountdown(45)).toBe('T-00:45');
  });
  it('negative (post-gun)', () => {
    expect(formatCountdown(-67)).toBe('T+01:07');
  });
});
