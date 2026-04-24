import { defaultValidityFor } from '../domain/markLifecycle';
import type { MarkInput } from '../types/mark';

import { __resetDbForTests } from './db';
import {
  createMark,
  deleteMark,
  getMark,
  listMarks,
  purgeExpiredMarks,
  updateMark,
} from './marksRepo';

jest.mock('expo-sqlite');

// The mocked expo-sqlite module exposes a test helper that's not part of
// the real module surface; pull it out via require so TypeScript doesn't
// demand the member on the real type.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __clearAllDatabases } = require('expo-sqlite') as {
  __clearAllDatabases: () => void;
};

function baseInput(overrides: Partial<MarkInput> = {}): MarkInput {
  const now = new Date('2026-04-24T12:00:00Z');
  const { validFrom, validUntil } = defaultValidityFor('club-seasonal', now);
  return {
    name: 'Yellow',
    latitude: 52.82,
    longitude: -4.5,
    tier: 'club-seasonal',
    source: 'club-library',
    icon: 'racing-yellow',
    shape: 'spherical',
    validFrom,
    validUntil,
    owner: 'Abersoch SC',
    ...overrides,
  };
}

beforeEach(() => {
  __clearAllDatabases();
  __resetDbForTests();
});

describe('marksRepo', () => {
  const now = new Date('2026-04-24T12:00:00Z');

  it('round-trip: create → list → update → delete', async () => {
    const created = await createMark(baseInput(), now);
    expect(created.id).toMatch(/^mark_/);
    expect(created.confidence).toBeGreaterThan(0);

    const listed = await listMarks({}, now);
    expect(listed).toHaveLength(1);
    expect(listed[0]!.name).toBe('Yellow');

    const updated = await updateMark(created.id, { name: 'Yellow (moved)' }, now);
    expect(updated.name).toBe('Yellow (moved)');

    await deleteMark(created.id);
    expect(await getMark(created.id, now)).toBeNull();
    expect(await listMarks({}, now)).toHaveLength(0);
  });

  it('filters by tier', async () => {
    await createMark(baseInput({ name: 'Seasonal', tier: 'club-seasonal' }), now);
    await createMark(
      baseInput({
        name: 'Recent',
        tier: 'race-day-recent',
        ...defaultValidityFor('race-day-recent', now),
      }),
      now,
    );

    const seasonal = await listMarks({ tier: 'club-seasonal' }, now);
    expect(seasonal.map((m) => m.name)).toEqual(['Seasonal']);

    const recent = await listMarks({ tier: 'race-day-recent' }, now);
    expect(recent.map((m) => m.name)).toEqual(['Recent']);
  });

  it('filters by case-insensitive search against name and notes', async () => {
    await createMark(baseInput({ name: 'North Cardinal' }), now);
    await createMark(baseInput({ name: 'Yellow', notes: 'near the NORTH rocks' }), now);
    await createMark(baseInput({ name: 'Red', notes: 'far south' }), now);

    const results = await listMarks({ search: 'north' }, now);
    expect(results.map((m) => m.name).sort()).toEqual(['North Cardinal', 'Yellow']);
  });

  it('filters by bounding box', async () => {
    await createMark(baseInput({ name: 'Inside', latitude: 52.8, longitude: -4.5 }), now);
    await createMark(baseInput({ name: 'Outside', latitude: 53.5, longitude: -4.5 }), now);

    const hits = await listMarks(
      { bbox: { minLat: 52.0, maxLat: 53.0, minLon: -5.0, maxLon: -4.0 } },
      now,
    );
    expect(hits.map((m) => m.name)).toEqual(['Inside']);
  });

  it('activeOnly filter excludes marks whose validUntil is in the past', async () => {
    await createMark(
      baseInput({
        name: 'Fresh',
        tier: 'race-day-recent',
        ...defaultValidityFor('race-day-recent', now),
      }),
      now,
    );
    await createMark(
      baseInput({
        name: 'Expired',
        tier: 'single-race-temporary',
        validFrom: '2026-04-23T12:00:00Z',
        validUntil: '2026-04-23T20:00:00Z',
      }),
      now,
    );

    const active = await listMarks({ activeOnly: true }, now);
    expect(active.map((m) => m.name)).toEqual(['Fresh']);
  });

  it('confidence is derived on read (not stored), and reflects age', async () => {
    const created = await createMark(
      baseInput({
        name: 'Aged',
        tier: 'race-day-recent',
        validFrom: '2026-04-10T12:00:00Z',
        validUntil: '2026-04-24T12:00:00Z',
      }),
      now,
    );
    // 14 days old → full -0.2 age penalty against the 0.7 base = 0.5.
    expect(created.confidence).toBeCloseTo(0.5, 2);
  });

  it('purgeExpiredMarks removes only dated-tier marks past validUntil', async () => {
    await createMark(baseInput({ name: 'Keep seasonal', tier: 'club-seasonal' }), now);
    await createMark(
      baseInput({ name: 'Keep permanent', tier: 'chart-permanent', validFrom: null, validUntil: null }),
      now,
    );
    await createMark(
      baseInput({
        name: 'Purge temp',
        tier: 'single-race-temporary',
        validFrom: '2026-04-23T18:00:00Z',
        validUntil: '2026-04-23T21:00:00Z',
      }),
      now,
    );
    await createMark(
      baseInput({
        name: 'Purge recent',
        tier: 'race-day-recent',
        validFrom: '2026-04-01T00:00:00Z',
        validUntil: '2026-04-15T00:00:00Z',
      }),
      now,
    );
    await createMark(
      baseInput({
        name: 'Keep recent',
        tier: 'race-day-recent',
        validFrom: '2026-04-20T12:00:00Z',
        validUntil: '2026-05-04T12:00:00Z',
      }),
      now,
    );

    const removed = await purgeExpiredMarks(now);
    expect(removed).toBe(2);

    const remaining = (await listMarks({}, now)).map((m) => m.name).sort();
    expect(remaining).toEqual(['Keep permanent', 'Keep recent', 'Keep seasonal']);
  });
});
