import { getTemplate } from '../domain/courseTemplates';
import type { MarkInput } from '../types/mark';

import {
  createCourse,
  deleteCourse,
  getActiveDraft,
  getCourse,
  listCourses,
  updateCourse,
} from './coursesRepo';
import { __resetDbForTests } from './db';
import { createMark } from './marksRepo';

jest.mock('expo-sqlite');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __clearAllDatabases } = require('expo-sqlite') as {
  __clearAllDatabases: () => void;
};

beforeEach(() => {
  __clearAllDatabases();
  __resetDbForTests();
});

const NOW = new Date('2026-04-24T12:00:00Z');

function markInput(name: string, overrides: Partial<MarkInput> = {}): MarkInput {
  return {
    name,
    latitude: 52.82,
    longitude: -4.5,
    tier: 'club-seasonal',
    source: 'club-library',
    icon: 'custom',
    shape: 'unknown',
    validFrom: null,
    validUntil: null,
    owner: 'Test',
    ...overrides,
  };
}

async function seedMarks(...names: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const n of names) {
    const m = await createMark(markInput(n));
    out.push(m.id);
  }
  return out;
}

describe('coursesRepo', () => {
  it('round-trip: create W-L → get → update legs → delete', async () => {
    const [cbId, pinId, yellowId, redId] = await seedMarks('CB', 'Pin', 'Yellow', 'Red');
    const template = getTemplate('windward-leeward');
    const legs = template.buildLegs();
    legs[0]!.markIds = [cbId!, pinId!];
    legs[1]!.markIds = [yellowId!];

    const created = await createCourse(
      {
        name: 'Wed evening',
        templateId: 'windward-leeward',
        legs,
      },
      NOW,
    );
    expect(created.id).toMatch(/^course_/);
    expect(created.state).toBe('draft');
    expect(created.legs).toHaveLength(4);
    expect(created.legs[0]!.markIds).toEqual([cbId, pinId]);

    const loaded = await getCourse(created.id);
    expect(loaded?.name).toBe('Wed evening');
    expect(loaded?.legs[1]!.markIds).toEqual([yellowId]);

    const updated = await updateCourse(
      created.id,
      {
        legs: created.legs.map((l, i) =>
          i === 2 ? { ...l, markIds: [redId!] } : l,
        ),
      },
      new Date('2026-04-24T12:01:00Z'),
    );
    expect(updated.legs[2]!.markIds).toEqual([redId]);

    await deleteCourse(created.id);
    expect(await getCourse(created.id)).toBeNull();
  });

  it('preserves leg order across save → load', async () => {
    const legs = getTemplate('olympic').buildLegs();
    const course = await createCourse(
      { name: 'Olympic', templateId: 'olympic', legs },
      NOW,
    );
    const types = course.legs.map((l) => l.type);
    expect(types).toEqual(['start', 'windward', 'reach', 'leeward', 'windward', 'finish']);

    const roundtripped = await getCourse(course.id);
    expect(roundtripped!.legs.map((l) => l.type)).toEqual(types);
  });

  it('getActiveDraft returns the most recently updated draft', async () => {
    const old = await createCourse(
      {
        name: 'Old',
        templateId: 'windward-leeward',
        legs: getTemplate('windward-leeward').buildLegs(),
      },
      new Date('2026-04-20T10:00:00Z'),
    );
    const fresh = await createCourse(
      {
        name: 'Fresh',
        templateId: 'triangle',
        legs: getTemplate('triangle').buildLegs(),
      },
      new Date('2026-04-24T12:00:00Z'),
    );
    const draft = await getActiveDraft();
    expect(draft?.id).toBe(fresh.id);
    expect(draft?.name).toBe('Fresh');

    // An archived course shouldn't surface as active draft even if it was
    // updated most recently.
    await updateCourse(fresh.id, { state: 'archived' }, new Date('2026-04-24T12:10:00Z'));
    const draft2 = await getActiveDraft();
    expect(draft2?.id).toBe(old.id);
  });

  it('listCourses filters by state', async () => {
    await createCourse(
      {
        name: 'Draft',
        templateId: 'windward-leeward',
        legs: getTemplate('windward-leeward').buildLegs(),
      },
      NOW,
    );
    const armed = await createCourse(
      {
        name: 'Armed',
        templateId: 'triangle',
        legs: getTemplate('triangle').buildLegs(),
      },
      NOW,
    );
    await updateCourse(armed.id, { state: 'armed' });

    expect((await listCourses('draft')).map((c) => c.name)).toEqual(['Draft']);
    expect((await listCourses('armed')).map((c) => c.name)).toEqual(['Armed']);
    expect((await listCourses()).length).toBe(2);
  });
});
