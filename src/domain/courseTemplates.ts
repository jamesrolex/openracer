/**
 * Course template catalogue. Each template is a pure-data factory that
 * returns a fresh set of empty `Leg` slots when the user picks it in the
 * UI. New templates are additive — no screen logic to change.
 *
 * Required-mark counts:
 * - Start / Finish / Gate: 2 marks (one each side of the line / gate)
 * - Windward / Leeward / Reach: 1 rounding mark
 *
 * Rounding convention (ISAF default): port rounding for windward-leeward
 * courses. Overridable per-leg in the future; not exposed in UI yet.
 */

import type { CourseTemplate, CourseTemplateId, Leg } from '../types/course';

function legId(): string {
  return `leg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function mk(
  type: Leg['type'],
  label: string,
  requiredMarks: number,
  rounding: Leg['rounding'] = null,
): Leg {
  return { id: legId(), type, label, markIds: [], requiredMarks, rounding };
}

const TEMPLATES: Record<CourseTemplateId, CourseTemplate> = {
  'windward-leeward': {
    id: 'windward-leeward',
    name: 'Windward-Leeward',
    description: 'Classic upwind-downwind sausage. Most common club race shape.',
    buildLegs: () => [
      mk('start', 'Start line', 2),
      mk('windward', 'Windward', 1, 'port'),
      mk('leeward', 'Leeward', 1, 'port'),
      mk('finish', 'Finish', 2),
    ],
  },
  olympic: {
    id: 'olympic',
    name: 'Olympic',
    description: 'Windward-reach-leeward with an offset wing mark. Used at regattas.',
    buildLegs: () => [
      mk('start', 'Start line', 2),
      mk('windward', 'Windward', 1, 'port'),
      mk('reach', 'Offset / reach', 1, 'port'),
      mk('leeward', 'Leeward', 1, 'port'),
      mk('windward', 'Windward (2)', 1, 'port'),
      mk('finish', 'Finish', 2),
    ],
  },
  triangle: {
    id: 'triangle',
    name: 'Triangle',
    description: 'Three-sided course — windward, reach, run back to the line.',
    buildLegs: () => [
      mk('start', 'Start line', 2),
      mk('windward', 'Windward', 1, 'port'),
      mk('reach', 'Reach', 1, 'port'),
      mk('finish', 'Finish', 2),
    ],
  },
  trapezoid: {
    id: 'trapezoid',
    name: 'Trapezoid',
    description: 'Four-sided: windward, offset, reach, gate, leeward. Used when fleets share water.',
    buildLegs: () => [
      mk('start', 'Start line', 2),
      mk('windward', 'Windward', 1, 'port'),
      mk('reach', 'Reach', 1, 'port'),
      mk('gate', 'Leeward gate', 2, null),
      mk('finish', 'Finish', 2),
    ],
  },
  'round-the-cans': {
    id: 'round-the-cans',
    name: 'Round the cans',
    description: 'Use fixed club marks in any order. Start with two rounding marks — add more below.',
    buildLegs: () => [
      mk('start', 'Start line', 2),
      mk('windward', 'Mark 1', 1, 'port'),
      mk('leeward', 'Mark 2', 1, 'port'),
      mk('finish', 'Finish', 2),
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Build from scratch. Start and finish are pre-filled; add rounding legs as you go.',
    buildLegs: () => [
      mk('start', 'Start line', 2),
      mk('finish', 'Finish', 2),
    ],
  },
};

export const COURSE_TEMPLATES: CourseTemplate[] = Object.values(TEMPLATES);

export function getTemplate(id: CourseTemplateId): CourseTemplate {
  return TEMPLATES[id];
}

/** Adds one more generic rounding leg to a custom course, before the finish. */
export function appendRoundingLeg(legs: Leg[], label: string): Leg[] {
  const finishIdx = legs.findIndex((l) => l.type === 'finish');
  const newLeg = mk('windward', label, 1, 'port');
  if (finishIdx === -1) return [...legs, newLeg];
  return [...legs.slice(0, finishIdx), newLeg, ...legs.slice(finishIdx)];
}

/** True when every required leg has enough marks to race. */
export function isCourseReadyToArm(legs: Leg[]): boolean {
  if (legs.length === 0) return false;
  return legs.every((l) => l.markIds.length >= l.requiredMarks);
}

/** Count of legs still missing required marks. */
export function remainingLegsToFill(legs: Leg[]): number {
  return legs.reduce(
    (acc, l) => acc + Math.max(0, l.requiredMarks - l.markIds.length),
    0,
  );
}
