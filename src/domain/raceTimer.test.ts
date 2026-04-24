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

describe('makeSnapshot — postponement (AP)', () => {
  it('reports postponed state when AP is up, regardless of clock', () => {
    const ap = '2026-04-24T18:42:30Z'; // raised at T-2:30
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:43:00Z'), undefined, {
      postponedAt: ap,
    });
    expect(snap.state).toBe('postponed');
    expect(snap.band).toBe('preparing');
  });

  it('freezes the countdown at the moment AP went up', () => {
    const ap = '2026-04-24T18:42:30Z'; // T-2:30
    // Now is well past the gun, but AP still controls.
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:50:00Z'), undefined, {
      postponedAt: ap,
    });
    expect(snap.state).toBe('postponed');
    expect(snap.secondsToStart).toBe(150);
  });

  it('AP wins over individual-recall (race is paused, X meaningless)', () => {
    const ap = '2026-04-24T18:46:00Z';
    const x = '2026-04-24T18:45:30Z';
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:46:30Z'), undefined, {
      postponedAt: ap,
      individualRecallAt: x,
    });
    expect(snap.state).toBe('postponed');
  });

  it('clearing AP returns to the time-driven state', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:43:00Z'), undefined, {
      postponedAt: null,
    });
    expect(snap.state).toBe('counting-down');
  });
});

describe('makeSnapshot — individual recall (X)', () => {
  it('overlays running with individual-recall while inside the 4-min window', () => {
    const x = '2026-04-24T18:45:00Z'; // raised at the gun
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:46:00Z'), undefined, {
      individualRecallAt: x,
    });
    expect(snap.state).toBe('individual-recall');
  });

  it('falls back to running once the 4-min window closes', () => {
    const x = '2026-04-24T18:45:00Z';
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:49:30Z'), undefined, {
      individualRecallAt: x,
    });
    expect(snap.state).toBe('running');
  });

  it('does not apply X before the gun', () => {
    const x = '2026-04-24T18:45:00Z'; // raised at gun
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:43:00Z'), undefined, {
      individualRecallAt: x,
    });
    expect(snap.state).toBe('counting-down');
  });

  it('does not apply X if it is null', () => {
    const snap = makeSnapshot(gun.toISOString(), at('2026-04-24T18:46:00Z'), undefined, {
      individualRecallAt: null,
    });
    expect(snap.state).toBe('running');
  });
});
