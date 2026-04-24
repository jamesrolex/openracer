import { __resetDbForTests } from './db';
import { createMark, listMarks } from './marksRepo';
import { seedMarksIfEmpty } from './marksSeed';

jest.mock('expo-sqlite');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __clearAllDatabases } = require('expo-sqlite') as {
  __clearAllDatabases: () => void;
};

const NOW = new Date('2026-07-15T12:00:00Z');

beforeEach(() => {
  __clearAllDatabases();
  __resetDbForTests();
});

describe('seedMarksIfEmpty', () => {
  it('inserts the Abersoch fixture on an empty library', async () => {
    const inserted = await seedMarksIfEmpty(NOW);
    expect(inserted).toBeGreaterThan(0);
    const marks = await listMarks({}, NOW);
    expect(marks.length).toBe(inserted);
    expect(marks.map((m) => m.name)).toContain('Yellow');
  });

  it('is idempotent — second call inserts nothing', async () => {
    const first = await seedMarksIfEmpty(NOW);
    const second = await seedMarksIfEmpty(NOW);
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);
  });

  it('skips if the library already has marks (even without the seed flag)', async () => {
    await createMark(
      {
        name: 'Pre-existing',
        latitude: 52.8,
        longitude: -4.5,
        tier: 'club-seasonal',
        source: 'club-library',
        icon: 'custom',
        shape: 'unknown',
        validFrom: null,
        validUntil: null,
        owner: 'Test',
      },
      NOW,
    );
    const inserted = await seedMarksIfEmpty(NOW);
    expect(inserted).toBe(0);

    const names = (await listMarks({}, NOW)).map((m) => m.name);
    expect(names).toEqual(['Pre-existing']);
  });
});
