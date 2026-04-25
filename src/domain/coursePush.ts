/**
 * Committee-boat course-push codec.
 *
 * Build a bundle from a Course + its referenced Marks, sign it, and you
 * have something broadcast-ready. On the receiving side, parse+verify
 * before touching any persistence so an untrusted payload never makes it
 * into SQLite.
 *
 * Canonical JSON: keys sorted alphabetically at every level, no
 * whitespace, numbers rendered with `JSON.stringify` defaults. The
 * signature covers the canonical form so a bundle signed on one platform
 * verifies on another regardless of key insertion order.
 */

import type { Course } from '../types/course';
import type { Mark } from '../types/mark';
import type {
  BoatProfileMark,
  BoatProfilePayload,
  CoursePushBundle,
  CoursePushLeg,
  CoursePushMark,
  CoursePushPayload,
  FinishRecordPayload,
  RaceBundlePayload,
  SignedBoatProfile,
  SignedFinishRecord,
  SignedRaceBundle,
  StartSequenceWire,
} from '../types/coursePush';
import {
  BOAT_PROFILE_SCHEMA_VERSION,
  COURSE_PUSH_SCHEMA_VERSION,
  FINISH_RECORD_SCHEMA_VERSION,
  RACE_BUNDLE_SCHEMA_VERSION,
} from '../types/coursePush';

import { derivePublicKey, sign, verify } from './committeeKey';

/** Canonical-JSON encode — keys sorted recursively, no whitespace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) out[k] = sortKeys(v);
    return out;
  }
  return value;
}

export interface BuildBundleInput {
  course: Course;
  /** All marks referenced by any leg in the course. Missing marks →
   *  bundle build fails so we don't ship a half-bundle. */
  marks: Mark[];
  committeeId: string;
  committeeName: string;
  /** base64url-encoded P-256 private key. Never leaves the committee boat. */
  privateKey: string;
  scheduledStartAt?: string;
  now?: Date;
}

/** Construct + sign a bundle. Pure — no I/O. */
export function buildBundle(input: BuildBundleInput): CoursePushBundle {
  const { course, marks, committeeId, committeeName, privateKey } = input;
  const now = input.now ?? new Date();

  const markIndex = new Map(marks.map((m) => [m.id, m]));
  const usedIds = new Set(course.legs.flatMap((l) => l.markIds));
  const missing = [...usedIds].filter((id) => !markIndex.has(id));
  if (missing.length > 0) {
    throw new Error(
      `buildBundle: course references marks not in the supplied list: ${missing.join(', ')}`,
    );
  }

  const bundleMarks: CoursePushMark[] = [...usedIds].map((id) => {
    const m = markIndex.get(id)!;
    const entry: CoursePushMark = {
      refId: m.id,
      name: m.name,
      latitude: m.latitude,
      longitude: m.longitude,
      icon: m.icon,
      shape: m.shape,
      tier: m.tier,
    };
    if (m.notes) entry.notes = m.notes;
    return entry;
  });

  const legs: CoursePushLeg[] = course.legs.map((l) => ({
    type: l.type,
    label: l.label,
    markRefs: l.markIds,
    requiredMarks: l.requiredMarks,
    rounding: l.rounding,
  }));

  const payload: CoursePushPayload = {
    schemaVersion: COURSE_PUSH_SCHEMA_VERSION,
    issuedAt: now.toISOString(),
    committeeId,
    committeeName,
    courseName: course.name,
    marks: bundleMarks,
    legs,
    ...(input.scheduledStartAt ? { scheduledStartAt: input.scheduledStartAt } : {}),
    ...(course.startType !== 'standard-line' ? { startType: course.startType } : {}),
  };

  const canonical = canonicalJson(payload);
  const signature = sign(canonical, privateKey);

  return {
    payload,
    signature,
    publicKey: derivePublicKey(privateKey),
  };
}

export type DecodeError =
  | { kind: 'invalid-json'; message: string }
  | { kind: 'schema-mismatch'; got: string; expected: string }
  | { kind: 'missing-field'; field: string }
  | { kind: 'signature-invalid' }
  | { kind: 'required-marks-not-met'; legLabel: string }
  | { kind: 'mark-ref-unknown'; legLabel: string; markRef: string };

export type DecodeResult =
  | { ok: true; bundle: CoursePushBundle }
  | { ok: false; error: DecodeError };

/**
 * Parse a raw bundle string + verify its signature. Pure — no SQLite.
 * Receivers call ingest() separately once verify succeeds.
 */
export function decodeBundle(raw: string): DecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: { kind: 'invalid-json', message: (e as Error).message } };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: { kind: 'invalid-json', message: 'not an object' } };
  }

  const bundle = parsed as Partial<CoursePushBundle>;
  for (const field of ['payload', 'signature', 'publicKey'] as const) {
    if (bundle[field] === undefined || bundle[field] === null) {
      return { ok: false, error: { kind: 'missing-field', field } };
    }
  }

  const payload = bundle.payload!;
  if (payload.schemaVersion !== COURSE_PUSH_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'schema-mismatch',
        got: payload.schemaVersion ?? 'unknown',
        expected: COURSE_PUSH_SCHEMA_VERSION,
      },
    };
  }

  // Structural sanity: every leg's markRefs should point at a mark in the
  // marks list, and counts must match requiredMarks.
  const markIndex = new Map(payload.marks.map((m) => [m.refId, m]));
  for (const leg of payload.legs) {
    if (leg.markRefs.length < leg.requiredMarks) {
      return {
        ok: false,
        error: { kind: 'required-marks-not-met', legLabel: leg.label },
      };
    }
    for (const ref of leg.markRefs) {
      if (!markIndex.has(ref)) {
        return {
          ok: false,
          error: { kind: 'mark-ref-unknown', legLabel: leg.label, markRef: ref },
        };
      }
    }
  }

  const canonical = canonicalJson(payload);
  const verified = verify(canonical, bundle.signature!, bundle.publicKey!);
  if (!verified) {
    return { ok: false, error: { kind: 'signature-invalid' } };
  }

  return { ok: true, bundle: bundle as CoursePushBundle };
}

/** Human-readable description of a decode error, for the UI banner. */
export function describeDecodeError(err: DecodeError): string {
  switch (err.kind) {
    case 'invalid-json':
      return `Bundle is not valid JSON (${err.message}).`;
    case 'schema-mismatch':
      return `Bundle schema version ${err.got} does not match this app (${err.expected}).`;
    case 'missing-field':
      return `Bundle is missing required field "${err.field}".`;
    case 'signature-invalid':
      return 'Signature does not match — bundle was tampered with or signed by a different key.';
    case 'required-marks-not-met':
      return `Leg "${err.legLabel}" does not have enough marks.`;
    case 'mark-ref-unknown':
      return `Leg "${err.legLabel}" references mark "${err.markRef}" that is not in the bundle.`;
  }
}

// ---------------------------------------------------------------------------
// Phase 1.9 — race bundle codec
// ---------------------------------------------------------------------------

export interface BuildRaceBundleInput {
  course: Course;
  marks: Mark[];
  senderId: string;
  senderName: string;
  privateKey: string;
  raceName: string;
  gunAt: Date;
  startSequence: StartSequenceWire;
  manualTrueWindDegrees?: number;
  manualTrueWindKn?: number;
  rabbitLaunchAt?: string;
  now?: Date;
}

/** Build + sign a race bundle. Pure — no I/O. */
export function buildRaceBundle(input: BuildRaceBundleInput): SignedRaceBundle {
  const { course, marks, senderId, senderName, privateKey } = input;
  const now = input.now ?? new Date();

  // Build the embedded course payload by re-using the existing committee-
  // push path. The course inside a race bundle is identical in shape to a
  // committee bundle's payload.
  const inner = buildBundle({
    course,
    marks,
    committeeId: senderId,
    committeeName: senderName,
    privateKey,
    now,
  });

  const payload: RaceBundlePayload = {
    schemaVersion: RACE_BUNDLE_SCHEMA_VERSION,
    issuedAt: now.toISOString(),
    senderId,
    senderName,
    raceName: input.raceName,
    course: inner.payload,
    gunAt: input.gunAt.toISOString(),
    startSequence: input.startSequence,
    ...(input.manualTrueWindDegrees !== undefined
      ? { manualTrueWindDegrees: input.manualTrueWindDegrees }
      : {}),
    ...(input.manualTrueWindKn !== undefined
      ? { manualTrueWindKn: input.manualTrueWindKn }
      : {}),
    ...(input.rabbitLaunchAt ? { rabbitLaunchAt: input.rabbitLaunchAt } : {}),
  };

  const canonical = canonicalJson(payload);
  const signature = sign(canonical, privateKey);

  return {
    payload,
    signature,
    publicKey: derivePublicKey(privateKey),
  };
}

export type DecodeRaceError =
  | { kind: 'invalid-json'; message: string }
  | { kind: 'schema-mismatch'; got: string; expected: string }
  | { kind: 'missing-field'; field: string }
  | { kind: 'signature-invalid' };

export type DecodeRaceResult =
  | { ok: true; bundle: SignedRaceBundle }
  | { ok: false; error: DecodeRaceError };

/** Parse + verify a race bundle JSON string. */
export function decodeRaceBundle(raw: string): DecodeRaceResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      error: { kind: 'invalid-json', message: (e as Error).message },
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: { kind: 'invalid-json', message: 'not an object' },
    };
  }
  const bundle = parsed as Partial<SignedRaceBundle>;
  for (const field of ['payload', 'signature', 'publicKey'] as const) {
    if (bundle[field] === undefined || bundle[field] === null) {
      return { ok: false, error: { kind: 'missing-field', field } };
    }
  }
  const payload = bundle.payload!;
  if (payload.schemaVersion !== RACE_BUNDLE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'schema-mismatch',
        got: payload.schemaVersion ?? 'unknown',
        expected: RACE_BUNDLE_SCHEMA_VERSION,
      },
    };
  }
  for (const field of [
    'senderId',
    'senderName',
    'raceName',
    'course',
    'gunAt',
    'startSequence',
  ] as const) {
    if (payload[field] === undefined || payload[field] === null) {
      return { ok: false, error: { kind: 'missing-field', field } };
    }
  }
  const canonical = canonicalJson(payload);
  if (!verify(canonical, bundle.signature!, bundle.publicKey!)) {
    return { ok: false, error: { kind: 'signature-invalid' } };
  }
  return { ok: true, bundle: bundle as SignedRaceBundle };
}

export function describeRaceDecodeError(err: DecodeRaceError): string {
  switch (err.kind) {
    case 'invalid-json':
      return `Race bundle is not valid JSON (${err.message}).`;
    case 'schema-mismatch':
      return `Race bundle version ${err.got} does not match this app (${err.expected}).`;
    case 'missing-field':
      return `Race bundle is missing required field "${err.field}".`;
    case 'signature-invalid':
      return 'Race-bundle signature did not verify — sender key may have changed, or the bundle was tampered with.';
  }
}

// ---------------------------------------------------------------------------
// Phase 1.9 b — boat-profile codec
// ---------------------------------------------------------------------------

export interface BuildBoatProfileInput {
  senderId: string;
  senderName: string;
  privateKey: string;
  boatName: string;
  marks: Mark[];
  polarRaw?: string;
  now?: Date;
}

export function buildBoatProfile(input: BuildBoatProfileInput): SignedBoatProfile {
  const now = input.now ?? new Date();
  const profileMarks: BoatProfileMark[] = input.marks.map((m) => {
    const out: BoatProfileMark = {
      refId: m.id,
      name: m.name,
      latitude: m.latitude,
      longitude: m.longitude,
      tier: m.tier,
      source: m.source,
      icon: m.icon,
      shape: m.shape,
    };
    if (m.notes) out.notes = m.notes;
    if (m.colourHint) out.colourHint = m.colourHint;
    return out;
  });
  const payload: BoatProfilePayload = {
    schemaVersion: BOAT_PROFILE_SCHEMA_VERSION,
    issuedAt: now.toISOString(),
    senderId: input.senderId,
    senderName: input.senderName,
    boatName: input.boatName,
    marks: profileMarks,
    ...(input.polarRaw ? { polarRaw: input.polarRaw } : {}),
  };
  const canonical = canonicalJson(payload);
  const signature = sign(canonical, input.privateKey);
  return {
    payload,
    signature,
    publicKey: derivePublicKey(input.privateKey),
  };
}

export type DecodeProfileError =
  | { kind: 'invalid-json'; message: string }
  | { kind: 'schema-mismatch'; got: string; expected: string }
  | { kind: 'missing-field'; field: string }
  | { kind: 'signature-invalid' };

export type DecodeProfileResult =
  | { ok: true; bundle: SignedBoatProfile }
  | { ok: false; error: DecodeProfileError };

export function decodeBoatProfile(raw: string): DecodeProfileResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      error: { kind: 'invalid-json', message: (e as Error).message },
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: { kind: 'invalid-json', message: 'not an object' },
    };
  }
  const bundle = parsed as Partial<SignedBoatProfile>;
  for (const field of ['payload', 'signature', 'publicKey'] as const) {
    if (bundle[field] === undefined || bundle[field] === null) {
      return { ok: false, error: { kind: 'missing-field', field } };
    }
  }
  const payload = bundle.payload!;
  if (payload.schemaVersion !== BOAT_PROFILE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'schema-mismatch',
        got: payload.schemaVersion ?? 'unknown',
        expected: BOAT_PROFILE_SCHEMA_VERSION,
      },
    };
  }
  for (const field of ['senderId', 'senderName', 'boatName', 'marks'] as const) {
    if (payload[field] === undefined || payload[field] === null) {
      return { ok: false, error: { kind: 'missing-field', field } };
    }
  }
  const canonical = canonicalJson(payload);
  if (!verify(canonical, bundle.signature!, bundle.publicKey!)) {
    return { ok: false, error: { kind: 'signature-invalid' } };
  }
  return { ok: true, bundle: bundle as SignedBoatProfile };
}

export function describeBoatProfileDecodeError(err: DecodeProfileError): string {
  switch (err.kind) {
    case 'invalid-json':
      return `Boat profile is not valid JSON (${err.message}).`;
    case 'schema-mismatch':
      return `Boat profile version ${err.got} does not match this app (${err.expected}).`;
    case 'missing-field':
      return `Boat profile is missing required field "${err.field}".`;
    case 'signature-invalid':
      return 'Boat-profile signature did not verify.';
  }
}

// ----- Phase 1.15 — finish records ---------------------------------------

export interface BuildFinishRecordInput {
  privateKey: string;
  senderId: string;
  senderName: string;
  raceName: string;
  boatName: string;
  gunAt: Date;
  finishedAt: Date;
  courseId?: string;
  now?: Date;
}

export function buildFinishRecord(
  input: BuildFinishRecordInput,
): SignedFinishRecord {
  const elapsedSeconds = Math.max(
    0,
    Math.round((input.finishedAt.getTime() - input.gunAt.getTime()) / 1000),
  );
  const payload: FinishRecordPayload = {
    schemaVersion: FINISH_RECORD_SCHEMA_VERSION,
    issuedAt: (input.now ?? new Date()).toISOString(),
    senderId: input.senderId,
    senderName: input.senderName,
    raceName: input.raceName,
    boatName: input.boatName,
    gunAt: input.gunAt.toISOString(),
    finishedAt: input.finishedAt.toISOString(),
    elapsedSeconds,
    ...(input.courseId ? { courseId: input.courseId } : {}),
  };
  const canonical = canonicalJson(payload);
  const signature = sign(canonical, input.privateKey);
  return {
    payload,
    signature,
    publicKey: derivePublicKey(input.privateKey),
  };
}

export type DecodeFinishError =
  | { kind: 'invalid-json'; message: string }
  | { kind: 'schema-mismatch'; got: string; expected: string }
  | { kind: 'missing-field'; field: string }
  | { kind: 'signature-invalid' };

export type DecodeFinishResult =
  | { ok: true; bundle: SignedFinishRecord }
  | { ok: false; error: DecodeFinishError };

export function decodeFinishRecord(raw: string): DecodeFinishResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      error: { kind: 'invalid-json', message: (e as Error).message },
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: { kind: 'invalid-json', message: 'not an object' },
    };
  }
  const bundle = parsed as Partial<SignedFinishRecord>;
  for (const field of ['payload', 'signature', 'publicKey'] as const) {
    if (bundle[field] === undefined || bundle[field] === null) {
      return { ok: false, error: { kind: 'missing-field', field } };
    }
  }
  const payload = bundle.payload!;
  if (payload.schemaVersion !== FINISH_RECORD_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'schema-mismatch',
        got: payload.schemaVersion ?? 'unknown',
        expected: FINISH_RECORD_SCHEMA_VERSION,
      },
    };
  }
  for (const field of [
    'senderId',
    'senderName',
    'raceName',
    'boatName',
    'gunAt',
    'finishedAt',
    'elapsedSeconds',
  ] as const) {
    if (payload[field] === undefined || payload[field] === null) {
      return { ok: false, error: { kind: 'missing-field', field } };
    }
  }
  const canonical = canonicalJson(payload);
  if (!verify(canonical, bundle.signature!, bundle.publicKey!)) {
    return { ok: false, error: { kind: 'signature-invalid' } };
  }
  return { ok: true, bundle: bundle as SignedFinishRecord };
}

export function describeFinishDecodeError(err: DecodeFinishError): string {
  switch (err.kind) {
    case 'invalid-json':
      return `Finish record is not valid JSON (${err.message}).`;
    case 'schema-mismatch':
      return `Finish-record version ${err.got} does not match this app (${err.expected}).`;
    case 'missing-field':
      return `Finish record is missing required field "${err.field}".`;
    case 'signature-invalid':
      return 'Finish-record signature did not verify.';
  }
}
