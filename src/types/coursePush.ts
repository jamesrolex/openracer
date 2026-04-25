/**
 * Committee-boat course-push wire format.
 *
 * Compatible in spirit with the SAP Buoy Pinger schema (open-sourced
 * Oct 2025 after SAP Sailing Analytics went open): a committee boat
 * broadcasts a course bundle over mDNS / BLE; receiving devices parse,
 * verify, and adopt it in one tap. We follow SAP's shape so clubs that
 * run Buoy Pinger directly can interoperate; everything here is plain
 * JSON so the schema is self-describing in traffic captures.
 *
 * Versioning: `schemaVersion` is a semver-flavoured string. Bumped for
 * breaking changes; additive fields carry the same version. Decoders
 * ignore unknown fields to stay forward-compatible.
 *
 * Signature: `ECDSA P-256 (secp256r1)` over the canonical JSON of the
 * unsigned `payload`, encoded as URL-safe base64. Receivers verify
 * against the committee's public key recorded in the local trust list
 * (populated via QR scan at the club — never trust-on-first-use).
 */

import type { MarkIcon, MarkShape, MarkTier } from './mark';

export const COURSE_PUSH_SCHEMA_VERSION = '1.0.0';

/** A mark as broadcast — pared down to the racing-essential fields. */
export interface CoursePushMark {
  /** Stable id within the bundle, referenced by legs. Not persisted on
   *  receivers — each receiver assigns its own local mark id. */
  refId: string;
  name: string;
  latitude: number;
  longitude: number;
  icon: MarkIcon;
  shape: MarkShape;
  /** Tier hint. Receivers default to `race-day-recent` since a
   *  committee-pushed mark is by definition fresh. */
  tier?: MarkTier;
  notes?: string;
}

export type CoursePushLegType =
  | 'start'
  | 'windward'
  | 'leeward'
  | 'reach'
  | 'gate'
  | 'finish';

export interface CoursePushLeg {
  type: CoursePushLegType;
  label: string;
  /** Ordered list of mark `refId`s. Length must equal `requiredMarks`
   *  for the bundle to be accepted. */
  markRefs: string[];
  requiredMarks: number;
  rounding: 'port' | 'starboard' | null;
}

/**
 * The signed payload. Canonical JSON of this object (keys sorted, no
 * whitespace, stable number formatting) is what the signature covers.
 */
export interface CoursePushPayload {
  schemaVersion: string;
  /** `YYYY-MM-DDThh:mm:ssZ` — when the committee generated the bundle. */
  issuedAt: string;
  /** Stable committee identifier. Typically a slug: `abersoch-sc`. */
  committeeId: string;
  /** Human-readable committee name. */
  committeeName: string;
  /** Free text — the race title on the course sheet. */
  courseName: string;
  marks: CoursePushMark[];
  legs: CoursePushLeg[];
  /** Optional — ISO 8601 start time if the committee has scheduled it. */
  scheduledStartAt?: string;
  /** Optional — start type. Older bundles omit; receivers default
   *  to `'standard-line'`. Additive; same schemaVersion. */
  startType?: 'standard-line' | 'rabbit' | 'gate';
}

/** A signed bundle as transmitted over mDNS / BLE and pasted via QR. */
export interface CoursePushBundle {
  payload: CoursePushPayload;
  /** base64url-encoded ECDSA P-256 signature over canonical JSON of
   *  `payload`. 64 bytes raw → 86 chars base64url. */
  signature: string;
  /** base64url-encoded committee public key (uncompressed 65 bytes for
   *  P-256, so 87 chars base64url). Receivers look this up in the
   *  local trust list to decide whether to accept. */
  publicKey: string;
}

/** Trust-list entry persisted on the receiver. */
export interface CommitteeTrust {
  /** Stable committee id — the lookup key. */
  committeeId: string;
  committeeName: string;
  publicKey: string;
  /** ISO 8601 UTC — when this key was added to the trust list. */
  addedAt: string;
}

/**
 * Race-share bundle (Phase 1.9). Reuses the committee-push course
 * payload but adds the live race state: gun time + sequence + the
 * inputs that shape the start-line readout. Sender signs with the
 * same ECDSA P-256 keypair used for committee identity, so trust
 * is identical — receivers only accept bundles from senders in
 * their trust list (or via trust-on-first-use UI).
 */
export const RACE_BUNDLE_SCHEMA_VERSION = '1.0.0';

export interface StartSequenceWire {
  warningAtMs: number;
  preparatoryAtMs: number;
  oneMinuteAtMs: number;
  startAtMs: 0;
}

export interface RaceBundlePayload {
  schemaVersion: string;
  /** ISO 8601 UTC — when the sender shared the bundle. */
  issuedAt: string;
  senderId: string;
  senderName: string;
  /** Free text — typically the course name from the sender's draft. */
  raceName: string;
  /** The course as committee-push payload. Receivers reuse the
   *  existing ingest path to materialise it locally. */
  course: CoursePushPayload;
  /** ISO 8601 UTC — sequenceStartTime at the moment of share. */
  gunAt: string;
  startSequence: StartSequenceWire;
  manualTrueWindDegrees?: number;
  manualTrueWindKn?: number;
  rabbitLaunchAt?: string;
}

export interface SignedRaceBundle {
  payload: RaceBundlePayload;
  /** base64url-encoded ECDSA P-256 signature over canonical JSON of payload. */
  signature: string;
  /** base64url-encoded sender public key. */
  publicKey: string;
}

/**
 * Boat-profile bundle (Phase 1.9 b) — share the persistent setup state
 * with crew at the start of a season. Carries the saved marks library
 * plus the polar table. Settings + theme + per-race state are NOT
 * shared (those are per-device / per-race).
 */
export const BOAT_PROFILE_SCHEMA_VERSION = '1.0.0';

export interface BoatProfileMark {
  refId: string;
  name: string;
  latitude: number;
  longitude: number;
  tier: MarkTier;
  source: string;
  icon: MarkIcon;
  shape: MarkShape;
  notes?: string;
  colourHint?: string;
}

export interface BoatProfilePayload {
  schemaVersion: string;
  issuedAt: string;
  senderId: string;
  senderName: string;
  /** Free text — typically the boat name. */
  boatName: string;
  marks: BoatProfileMark[];
  /** ORC polar text, optional. */
  polarRaw?: string;
}

export interface SignedBoatProfile {
  payload: BoatProfilePayload;
  signature: string;
  publicKey: string;
}

/**
 * Finish-record bundle (Phase 1.15) — a single boat's race result, shared
 * post-race over QR. Receivers merge multiple finish records into a
 * leaderboard view.
 *
 * Carries enough context to be useful standalone: race name, boat name,
 * gun time, finish time, elapsed seconds. Optional course id lets the
 * receiver deduplicate multiple shares of the same race when several
 * boats sailed the same one.
 */
export const FINISH_RECORD_SCHEMA_VERSION = '1.0.0';

export interface FinishRecordPayload {
  schemaVersion: string;
  /** ISO 8601 UTC — when the sender shared the bundle. */
  issuedAt: string;
  senderId: string;
  senderName: string;
  /** Free text — the course / race name. */
  raceName: string;
  /** Free text — the boat name (often === senderName but not always; a
   *  sailor on someone else's boat shares with that boat's name). */
  boatName: string;
  /** ISO 8601 UTC — start gun. */
  gunAt: string;
  /** ISO 8601 UTC — finish time. */
  finishedAt: string;
  /** Elapsed race time in seconds (finishedAt - gunAt). */
  elapsedSeconds: number;
  /** Optional course id for dedup; null if the race wasn't course-driven. */
  courseId?: string;
}

export interface SignedFinishRecord {
  payload: FinishRecordPayload;
  signature: string;
  publicKey: string;
}

/**
 * QR envelope. A QR code carries one of three payload kinds:
 *
 * - `trust`: committee's public identity. Scanning it adds the committee
 *   to the receiver's trust list so future bundles from them are accepted.
 * - `bundle`: a signed course-push bundle (committee → fleet).
 * - `race-bundle`: a signed live-race bundle (helm → crew, Phase 1.9).
 *
 * A discriminator is cheap and keeps the scanner from mis-dispatching.
 */
export type QrEnvelope =
  | { kind: 'openracer-trust'; version: string; trust: Omit<CommitteeTrust, 'addedAt'> }
  | { kind: 'openracer-bundle'; version: string; bundle: CoursePushBundle }
  | { kind: 'openracer-race-bundle'; version: string; bundle: SignedRaceBundle }
  | { kind: 'openracer-boat-profile'; version: string; bundle: SignedBoatProfile }
  | { kind: 'openracer-finish'; version: string; bundle: SignedFinishRecord };

export const QR_ENVELOPE_VERSION = '1.0.0';
