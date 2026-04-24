import { __resetDbForTests } from '../stores/db';
import { createMark, listMarks } from '../stores/marksRepo';

import { generateKeyPair } from './committeeKey';
import { buildBundle } from './coursePush';
import { ingestCoursePushBundle } from './coursePushIngest';

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

function makeBundle() {
  const kp = generateKeyPair();
  return buildBundle({
    course: {
      id: 'remote-course-1',
      name: 'Committee W-L',
      templateId: 'windward-leeward',
      state: 'armed',
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      legs: [
        {
          id: 'leg-start',
          type: 'start',
          label: 'Start line',
          markIds: ['ref-cb', 'ref-pin'],
          requiredMarks: 2,
          rounding: null,
        },
        {
          id: 'leg-wind',
          type: 'windward',
          label: 'Windward',
          markIds: ['ref-yellow'],
          requiredMarks: 1,
          rounding: 'port',
        },
      ],
    },
    marks: [
      {
        id: 'ref-cb',
        name: 'Committee Boat',
        latitude: 52.822,
        longitude: -4.509,
        tier: 'race-day-recent',
        source: 'committee-push',
        icon: 'committee-boat',
        shape: 'unknown',
        validFrom: null,
        validUntil: null,
        owner: 'Abersoch SC',
        confidence: 0.9,
      },
      {
        id: 'ref-pin',
        name: 'Pin End',
        latitude: 52.821,
        longitude: -4.513,
        tier: 'race-day-recent',
        source: 'committee-push',
        icon: 'pin-end',
        shape: 'pillar',
        validFrom: null,
        validUntil: null,
        owner: 'Abersoch SC',
        confidence: 0.9,
      },
      {
        id: 'ref-yellow',
        name: 'Yellow',
        latitude: 52.835,
        longitude: -4.515,
        tier: 'race-day-recent',
        source: 'committee-push',
        icon: 'racing-yellow',
        shape: 'spherical',
        validFrom: null,
        validUntil: null,
        owner: 'Abersoch SC',
        confidence: 0.9,
      },
    ],
    committeeId: 'abersoch-sc',
    committeeName: 'Abersoch SC',
    privateKey: kp.privateKey,
    now: NOW,
  });
}

describe('ingestCoursePushBundle', () => {
  it('creates marks + a draft course from a fresh bundle', async () => {
    const bundle = makeBundle();
    const result = await ingestCoursePushBundle(bundle, NOW);

    expect(result.marksCreated).toBe(3);
    expect(result.marksReused).toBe(0);
    expect(result.course.state).toBe('draft');
    expect(result.course.name).toBe('Committee W-L');
    expect(result.course.legs).toHaveLength(2);

    const marks = await listMarks({}, NOW);
    expect(marks).toHaveLength(3);
    const yellow = marks.find((m) => m.name === 'Yellow');
    expect(yellow?.source).toBe('committee-push');
    expect(yellow?.tier).toBe('race-day-recent');
  });

  it('reuses library marks by name + close position', async () => {
    // Pre-seed a Yellow that should be reused.
    await createMark(
      {
        name: 'Yellow',
        latitude: 52.835, // exact match
        longitude: -4.515,
        tier: 'club-seasonal',
        source: 'club-library',
        icon: 'racing-yellow',
        shape: 'spherical',
        validFrom: null,
        validUntil: null,
        owner: 'Me',
      },
      NOW,
    );

    const bundle = makeBundle();
    const result = await ingestCoursePushBundle(bundle, NOW);

    expect(result.marksCreated).toBe(2); // CB + Pin
    expect(result.marksReused).toBe(1); // Yellow

    const marks = await listMarks({}, NOW);
    expect(marks).toHaveLength(3);

    // Course's windward leg should point at the existing Yellow, not a new row.
    const windLeg = result.course.legs.find((l) => l.type === 'windward')!;
    const yellow = marks.find((m) => m.name === 'Yellow')!;
    expect(windLeg.markIds).toEqual([yellow.id]);
    expect(yellow.source).toBe('club-library'); // unchanged
  });
});
