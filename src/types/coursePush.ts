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
 * QR envelope. A QR code carries one of two payload kinds:
 *
 * - `trust`: committee's public identity. Scanning it adds the committee
 *   to the receiver's trust list so future bundles from them are accepted.
 * - `bundle`: a signed course-push bundle (same shape as over-the-wire).
 *
 * A discriminator is cheap and keeps the scanner from mis-dispatching.
 */
export type QrEnvelope =
  | { kind: 'openracer-trust'; version: string; trust: Omit<CommitteeTrust, 'addedAt'> }
  | { kind: 'openracer-bundle'; version: string; bundle: CoursePushBundle };

export const QR_ENVELOPE_VERSION = '1.0.0';
