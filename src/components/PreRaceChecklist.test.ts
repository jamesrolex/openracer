import { buildChecklist } from './PreRaceChecklist';
import type { Course, Leg } from '../types/course';

function leg(
  type: Leg['type'],
  required: number,
  marks: string[],
): Leg {
  return {
    id: `leg-${type}`,
    type,
    label: type,
    markIds: marks,
    requiredMarks: required,
    rounding: null,
  };
}

function fullCourse(
  startType: Course['startType'] = 'standard-line',
): Course {
  const startMarks = startType === 'standard-line' ? ['cb', 'pin'] : ['pin'];
  const startRequired = startType === 'standard-line' ? 2 : 1;
  return {
    id: 'c1',
    name: 'Test',
    templateId: 'windward-leeward',
    legs: [
      leg('start', startRequired, startMarks),
      leg('windward', 1, ['w']),
      leg('finish', 2, ['cb', 'pin']),
    ],
    state: 'draft',
    startType,
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
  };
}

describe('buildChecklist', () => {
  it('marks the course row as warn when legs are unfilled', () => {
    const course: Course = {
      ...fullCourse(),
      legs: [leg('start', 2, []), leg('windward', 1, [])],
    };
    const items = buildChecklist({
      course,
      windDirectionSet: true,
      gpsFresh: true,
      notificationsGranted: true,
      rabbitLaunchSet: false,
    });
    expect(items.find((i) => i.id === 'course')?.verdict).toBe('warn');
  });

  it('marks the course row as pass when fully filled', () => {
    const items = buildChecklist({
      course: fullCourse(),
      windDirectionSet: true,
      gpsFresh: true,
      notificationsGranted: true,
      rabbitLaunchSet: false,
    });
    expect(items.find((i) => i.id === 'course')?.verdict).toBe('pass');
  });

  it('shows a wind row for standard-line, not for rabbit', () => {
    const std = buildChecklist({
      course: fullCourse('standard-line'),
      windDirectionSet: false,
      gpsFresh: true,
      notificationsGranted: true,
      rabbitLaunchSet: false,
    });
    expect(std.find((i) => i.id === 'wind')?.verdict).toBe('warn');
    expect(std.find((i) => i.id === 'rabbit-launch')).toBeUndefined();

    const rabbit = buildChecklist({
      course: fullCourse('rabbit'),
      windDirectionSet: false, // irrelevant for rabbit
      gpsFresh: true,
      notificationsGranted: true,
      rabbitLaunchSet: false,
    });
    expect(rabbit.find((i) => i.id === 'wind')).toBeUndefined();
    expect(rabbit.find((i) => i.id === 'rabbit-launch')?.verdict).toBe('pass');
  });

  it('flags GPS as warn when stale', () => {
    const items = buildChecklist({
      course: fullCourse(),
      windDirectionSet: true,
      gpsFresh: false,
      notificationsGranted: true,
      rabbitLaunchSet: false,
    });
    expect(items.find((i) => i.id === 'gps')?.verdict).toBe('warn');
  });

  it('flags notifications as warn when not granted', () => {
    const items = buildChecklist({
      course: fullCourse(),
      windDirectionSet: true,
      gpsFresh: true,
      notificationsGranted: false,
      rabbitLaunchSet: false,
    });
    expect(items.find((i) => i.id === 'notifications')?.verdict).toBe(
      'warn',
    );
  });

  it('all-pass when every input is set', () => {
    const items = buildChecklist({
      course: fullCourse(),
      windDirectionSet: true,
      gpsFresh: true,
      notificationsGranted: true,
      rabbitLaunchSet: false,
    });
    expect(items.every((i) => i.verdict === 'pass')).toBe(true);
  });
});
