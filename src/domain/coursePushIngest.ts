/**
 * Bundle-to-SQLite ingest. Takes a verified CoursePushBundle and:
 * - creates (or merges) marks in the library with tier `race-day-recent`
 *   and source `committee-push`
 * - creates a draft course referencing the newly-created marks
 *
 * Verification is the caller's job — this function assumes the signature
 * has been checked and the committee is trusted. If a bundle reaches
 * here it's already been decided we want it.
 */

import { defaultValidityFor } from './markLifecycle';

import { createCourse } from '../stores/coursesRepo';
import { createMark, listMarks } from '../stores/marksRepo';
import type { Course, Leg } from '../types/course';
import type { CoursePushBundle } from '../types/coursePush';
import type { MarkInput } from '../types/mark';

function newLegId(): string {
  return `leg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface IngestResult {
  course: Course;
  /** Local mark ids created or reused, keyed by the bundle's refId. */
  markIdByRef: Map<string, string>;
  /** How many marks were freshly created (the rest were reused by name). */
  marksCreated: number;
  marksReused: number;
}

/**
 * Write the bundle to SQLite. Marks are matched against the existing
 * library by exact `name` + rough position (<50m away) so a committee
 * broadcasting "Yellow" at the same coords as the sailor's existing
 * Yellow doesn't duplicate.
 */
export async function ingestCoursePushBundle(
  bundle: CoursePushBundle,
  now: Date = new Date(),
): Promise<IngestResult> {
  const { payload } = bundle;
  const existing = await listMarks({}, now);
  const markIdByRef = new Map<string, string>();
  let marksCreated = 0;
  let marksReused = 0;

  for (const m of payload.marks) {
    const reused = existing.find(
      (e) =>
        e.name.toLowerCase() === m.name.toLowerCase() &&
        Math.abs(e.latitude - m.latitude) < 0.0005 &&
        Math.abs(e.longitude - m.longitude) < 0.0005,
    );
    if (reused) {
      markIdByRef.set(m.refId, reused.id);
      marksReused += 1;
      continue;
    }
    const tier = m.tier ?? 'race-day-recent';
    const validity = defaultValidityFor(tier, now);
    const input: MarkInput = {
      name: m.name,
      latitude: m.latitude,
      longitude: m.longitude,
      tier,
      source: 'committee-push',
      icon: m.icon,
      shape: m.shape,
      validFrom: validity.validFrom,
      validUntil: validity.validUntil,
      owner: payload.committeeName,
      notes: m.notes,
    };
    const created = await createMark(input, now);
    markIdByRef.set(m.refId, created.id);
    marksCreated += 1;
  }

  const legs: Leg[] = payload.legs.map((l) => ({
    id: newLegId(),
    type: l.type,
    label: l.label,
    markIds: l.markRefs.map((ref) => {
      const id = markIdByRef.get(ref);
      if (!id) {
        throw new Error(`ingest: leg "${l.label}" references unknown mark "${ref}"`);
      }
      return id;
    }),
    requiredMarks: l.requiredMarks,
    rounding: l.rounding,
  }));

  const course = await createCourse(
    {
      name: payload.courseName,
      templateId: 'custom', // committee-pushed courses aren't bound to a template
      legs,
      state: 'draft',
    },
    now,
  );

  return { course, markIdByRef, marksCreated, marksReused };
}
