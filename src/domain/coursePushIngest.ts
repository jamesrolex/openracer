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
import { recordBoatJoin } from '../stores/joinedBoatsRepo';
import { createMark, listMarks } from '../stores/marksRepo';
import { useRaceStore } from '../stores/useRaceStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { Course, Leg } from '../types/course';
import type {
  CoursePushBundle,
  SignedBoatProfile,
  SignedRaceBundle,
} from '../types/coursePush';
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
      startType: payload.startType ?? 'standard-line',
    },
    now,
  );

  return { course, markIdByRef, marksCreated, marksReused };
}

export interface RaceIngestResult {
  course: Course;
  marksCreated: number;
  marksReused: number;
  /** Local race-session id created on arming. */
  sessionId: string;
}

/**
 * Apply a verified `SignedRaceBundle` to local SQLite + the in-memory
 * stores. Steps:
 *   1. Ingest the embedded course (re-uses ingestCoursePushBundle so
 *      the same mark-matching logic applies).
 *   2. Push the wind direction / speed into useSettingsStore (only
 *      when present in the bundle — never overwrite existing
 *      with `undefined`).
 *   3. Arm the race timer at the bundle's gun time + course id.
 *   4. If a rabbitLaunchAt is present, set it on the race store too.
 */
export async function ingestRaceBundle(
  bundle: SignedRaceBundle,
  now: Date = new Date(),
): Promise<RaceIngestResult> {
  const { payload } = bundle;

  // Re-use the committee-push ingest for the embedded course.
  const inner = await ingestCoursePushBundle(
    {
      payload: payload.course,
      signature: bundle.signature,
      publicKey: bundle.publicKey,
    },
    now,
  );

  // Settings — wind state.
  const settings = useSettingsStore.getState();
  if (typeof payload.manualTrueWindDegrees === 'number') {
    settings.setManualTrueWindDegrees(payload.manualTrueWindDegrees);
  }
  if (typeof payload.manualTrueWindKn === 'number') {
    settings.setManualTrueWindKn(payload.manualTrueWindKn);
  }

  // Arm the race at the same gun time + course.
  const race = useRaceStore.getState();
  const sessionId = await race.arm(new Date(payload.gunAt), inner.course.id);
  if (payload.rabbitLaunchAt) {
    race.setRabbitLaunchAt(new Date(payload.rabbitLaunchAt));
  }

  return {
    course: inner.course,
    marksCreated: inner.marksCreated,
    marksReused: inner.marksReused,
    sessionId,
  };
}

export interface BoatProfileIngestResult {
  marksCreated: number;
  marksReused: number;
  polarUpdated: boolean;
}

/**
 * Apply a verified `SignedBoatProfile` to local SQLite + settings.
 * Marks are matched against the existing library by name + rough
 * position (~50 m) so a re-scan doesn't duplicate.
 */
export async function ingestBoatProfile(
  bundle: SignedBoatProfile,
  now: Date = new Date(),
): Promise<BoatProfileIngestResult> {
  const { payload } = bundle;
  const existing = await listMarks({}, now);
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
      marksReused += 1;
      continue;
    }
    const validity = defaultValidityFor(m.tier, now);
    await createMark(
      {
        name: m.name,
        latitude: m.latitude,
        longitude: m.longitude,
        tier: m.tier,
        source: m.source as MarkInput['source'],
        icon: m.icon,
        shape: m.shape,
        validFrom: validity.validFrom,
        validUntil: validity.validUntil,
        owner: payload.senderName,
        notes: m.notes,
        colourHint: m.colourHint,
      },
      now,
    );
    marksCreated += 1;
  }

  let polarUpdated = false;
  if (typeof payload.polarRaw === 'string' && payload.polarRaw.length > 0) {
    useSettingsStore.getState().setPolarRaw(payload.polarRaw);
    polarUpdated = true;
  }

  // Personal sailor log — record this join event so it shows up in
  // the lifetime sailing log + "Recent boats" list.
  await recordBoatJoin(
    {
      senderId: payload.senderId,
      senderName: payload.senderName,
      boatName: payload.boatName,
      marksAdded: marksCreated,
      polarReceived: polarUpdated,
    },
    now,
  );

  return { marksCreated, marksReused, polarUpdated };
}
