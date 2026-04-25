import { applyHistoryFilter } from './RaceSessionsScreen';
import type { RaceSession } from '../types/race';

function row(
  id: string,
  startedAt: string,
  state: RaceSession['state'],
  points: number,
) {
  return {
    session: {
      id,
      courseId: null,
      startedAt,
      finishedAt: state === 'finished' ? startedAt : null,
      state,
    } as RaceSession,
    points,
  };
}

describe('applyHistoryFilter', () => {
  const now = new Date('2026-04-25T22:00:00Z').getTime();
  const today = '2026-04-25T18:00:00Z';
  const lastWeek = '2026-04-20T18:00:00Z';
  const oldRace = '2026-01-15T18:00:00Z';

  const rows = [
    row('s1', today, 'finished', 4500),
    row('s2', today, 'abandoned', 200),
    row('s3', lastWeek, 'finished', 1500),
    row('s4', oldRace, 'finished', 0),
  ];

  it('all returns everything', () => {
    expect(applyHistoryFilter(rows, '', 'all', now)).toHaveLength(4);
  });

  it('finished filters to finished sessions only', () => {
    const out = applyHistoryFilter(rows, '', 'finished', now);
    expect(out.map((r) => r.session.id)).toEqual(['s1', 's3', 's4']);
  });

  it('abandoned filters to abandoned sessions only', () => {
    const out = applyHistoryFilter(rows, '', 'abandoned', now);
    expect(out.map((r) => r.session.id)).toEqual(['s2']);
  });

  it('has-track drops zero-point sessions', () => {
    const out = applyHistoryFilter(rows, '', 'has-track', now);
    expect(out.map((r) => r.session.id)).toEqual(['s1', 's2', 's3']);
  });

  it('this-week is the last 7 days from now', () => {
    const out = applyHistoryFilter(rows, '', 'this-week', now);
    expect(out.map((r) => r.session.id).sort()).toEqual(['s1', 's2', 's3'].sort());
  });

  it('last-30-days excludes the January race', () => {
    const out = applyHistoryFilter(rows, '', 'last-30-days', now);
    expect(out.map((r) => r.session.id).sort()).toEqual(['s1', 's2', 's3'].sort());
  });

  it('search by date prefix narrows the list', () => {
    const out = applyHistoryFilter(rows, '2026-04-25', 'all', now);
    expect(out.map((r) => r.session.id).sort()).toEqual(['s1', 's2'].sort());
  });

  it('search + filter compose', () => {
    const out = applyHistoryFilter(rows, '2026-04-25', 'finished', now);
    expect(out.map((r) => r.session.id)).toEqual(['s1']);
  });
});
