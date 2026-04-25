/**
 * QR envelope encode / decode. The QR string is just a compact JSON of
 * a QrEnvelope — no base64 wrapping, no compression. Keep it dumb so
 * debugging is "scan and read".
 *
 * If a course bundle ever outgrows QR capacity (~2900 alphanumeric
 * chars) we'll add gzip + base64url here, behind a version bump. For
 * Phase 1 W-L courses the payload is well under that.
 */

import type {
  CommitteeTrust,
  CoursePushBundle,
  QrEnvelope,
  SignedRaceBundle,
} from '../types/coursePush';
import { QR_ENVELOPE_VERSION } from '../types/coursePush';

export function encodeTrustQr(trust: Omit<CommitteeTrust, 'addedAt'>): string {
  const envelope: QrEnvelope = {
    kind: 'openracer-trust',
    version: QR_ENVELOPE_VERSION,
    trust,
  };
  return JSON.stringify(envelope);
}

export function encodeBundleQr(bundle: CoursePushBundle): string {
  const envelope: QrEnvelope = {
    kind: 'openracer-bundle',
    version: QR_ENVELOPE_VERSION,
    bundle,
  };
  return JSON.stringify(envelope);
}

export function encodeRaceBundleQr(bundle: SignedRaceBundle): string {
  const envelope: QrEnvelope = {
    kind: 'openracer-race-bundle',
    version: QR_ENVELOPE_VERSION,
    bundle,
  };
  return JSON.stringify(envelope);
}

export type QrDecodeError =
  | { kind: 'invalid-json'; message: string }
  | { kind: 'not-openracer'; got: string }
  | { kind: 'version-mismatch'; got: string; expected: string }
  | { kind: 'missing-field'; field: string };

export type QrDecodeResult =
  | { ok: true; envelope: QrEnvelope }
  | { ok: false; error: QrDecodeError };

export function decodeQr(raw: string): QrDecodeResult {
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
    return { ok: false, error: { kind: 'invalid-json', message: 'not an object' } };
  }

  const env = parsed as Partial<QrEnvelope>;
  if (
    env.kind !== 'openracer-trust' &&
    env.kind !== 'openracer-bundle' &&
    env.kind !== 'openracer-race-bundle'
  ) {
    return { ok: false, error: { kind: 'not-openracer', got: String(env.kind) } };
  }
  if (env.version !== QR_ENVELOPE_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'version-mismatch',
        got: env.version ?? 'unknown',
        expected: QR_ENVELOPE_VERSION,
      },
    };
  }

  if (env.kind === 'openracer-trust' && !env.trust) {
    return { ok: false, error: { kind: 'missing-field', field: 'trust' } };
  }
  if (
    (env.kind === 'openracer-bundle' || env.kind === 'openracer-race-bundle') &&
    !env.bundle
  ) {
    return { ok: false, error: { kind: 'missing-field', field: 'bundle' } };
  }

  return { ok: true, envelope: env as QrEnvelope };
}

export function describeQrDecodeError(err: QrDecodeError): string {
  switch (err.kind) {
    case 'invalid-json':
      return `QR content is not valid JSON (${err.message}).`;
    case 'not-openracer':
      return `Scanned QR isn't an OpenRacer code (got "${err.got}").`;
    case 'version-mismatch':
      return `QR uses envelope version ${err.got}; this app expects ${err.expected}.`;
    case 'missing-field':
      return `QR is missing required field "${err.field}".`;
  }
}
