import type { Course } from '../types/course';
import type { Mark } from '../types/mark';

import { generateKeyPair } from './committeeKey';
import { buildBundle, canonicalJson, decodeBundle, describeDecodeError } from './coursePush';

function mark(id: string, name: string, lat = 52.8, lon = -4.5): Mark {
  return {
    id,
    name,
    latitude: lat,
    longitude: lon,
    tier: 'club-seasonal',
    source: 'club-library',
    icon: 'custom',
    shape: 'unknown',
    validFrom: null,
    validUntil: null,
    owner: 'Abersoch SC',
    confidence: 0.9,
  };
}

function course(): Course {
  return {
    id: 'course-1',
    name: 'Wed evening',
    templateId: 'windward-leeward',
    state: 'armed',
    createdAt: '2026-04-24T12:00:00Z',
    updatedAt: '2026-04-24T12:00:00Z',
    legs: [
      {
        id: 'leg-start',
        type: 'start',
        label: 'Start line',
        markIds: ['mark-cb', 'mark-pin'],
        requiredMarks: 2,
        rounding: null,
      },
      {
        id: 'leg-wind',
        type: 'windward',
        label: 'Windward',
        markIds: ['mark-yellow'],
        requiredMarks: 1,
        rounding: 'port',
      },
      {
        id: 'leg-lee',
        type: 'leeward',
        label: 'Leeward',
        markIds: ['mark-red'],
        requiredMarks: 1,
        rounding: 'port',
      },
      {
        id: 'leg-finish',
        type: 'finish',
        label: 'Finish',
        markIds: ['mark-cb', 'mark-pin'],
        requiredMarks: 2,
        rounding: null,
      },
    ],
  };
}

const marks = [
  mark('mark-cb', 'Committee Boat'),
  mark('mark-pin', 'Pin End'),
  mark('mark-yellow', 'Yellow'),
  mark('mark-red', 'Red'),
];

describe('canonicalJson', () => {
  it('sorts keys recursively and strips undefined', () => {
    const a = { b: 1, a: [2, 1], c: { y: 1, x: undefined, z: 0 } };
    expect(canonicalJson(a)).toBe('{"a":[2,1],"b":1,"c":{"y":1,"z":0}}');
  });

  it('produces identical output regardless of key order', () => {
    const x = { a: 1, b: 2 };
    const y = { b: 2, a: 1 };
    expect(canonicalJson(x)).toBe(canonicalJson(y));
  });
});

describe('buildBundle + decodeBundle round-trip', () => {
  it('signs, serialises, and verifies a full W-L bundle', () => {
    const kp = generateKeyPair();
    const bundle = buildBundle({
      course: course(),
      marks,
      committeeId: 'abersoch-sc',
      committeeName: 'Abersoch SC',
      privateKey: kp.privateKey,
      now: new Date('2026-04-24T17:00:00Z'),
    });

    expect(bundle.publicKey).toBe(kp.publicKey);
    expect(bundle.signature.length).toBeGreaterThan(80);

    const raw = JSON.stringify(bundle);
    const result = decodeBundle(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.bundle.payload.courseName).toBe('Wed evening');
    expect(result.bundle.payload.marks).toHaveLength(4);
    expect(result.bundle.payload.legs).toHaveLength(4);
    expect(result.bundle.payload.legs[1]!.rounding).toBe('port');
  });

  it('rejects when course references a mark not in the supplied list', () => {
    const kp = generateKeyPair();
    expect(() =>
      buildBundle({
        course: course(),
        marks: marks.slice(0, 2), // drop yellow + red
        committeeId: 'abersoch-sc',
        committeeName: 'Abersoch SC',
        privateKey: kp.privateKey,
      }),
    ).toThrow(/not in the supplied list/);
  });

  it('decode fails on tampered payload (signature mismatch)', () => {
    const kp = generateKeyPair();
    const bundle = buildBundle({
      course: course(),
      marks,
      committeeId: 'abersoch-sc',
      committeeName: 'Abersoch SC',
      privateKey: kp.privateKey,
    });
    // Tamper: rename a mark after signing.
    bundle.payload.marks[0]!.name = 'Hijacked Mark';
    const result = decodeBundle(JSON.stringify(bundle));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('signature-invalid');
  });

  it('decode fails on a bundle signed by a different committee', () => {
    const good = generateKeyPair();
    const impostor = generateKeyPair();
    const bundle = buildBundle({
      course: course(),
      marks,
      committeeId: 'abersoch-sc',
      committeeName: 'Abersoch SC',
      privateKey: good.privateKey,
    });
    // Swap in impostor's public key — signature was made with `good`.
    bundle.publicKey = impostor.publicKey;
    const result = decodeBundle(JSON.stringify(bundle));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('signature-invalid');
  });

  it('decode fails on schema version mismatch', () => {
    const kp = generateKeyPair();
    const bundle = buildBundle({
      course: course(),
      marks,
      committeeId: 'abersoch-sc',
      committeeName: 'Abersoch SC',
      privateKey: kp.privateKey,
    });
    bundle.payload.schemaVersion = '99.0.0';
    const result = decodeBundle(JSON.stringify(bundle));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('schema-mismatch');
  });

  it('decode fails on invalid JSON', () => {
    const result = decodeBundle('not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-json');
  });

  it('decode fails on missing field', () => {
    const result = decodeBundle(JSON.stringify({ payload: {} }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('missing-field');
  });
});

describe('describeDecodeError', () => {
  it('returns a plain-English sentence for each error kind', () => {
    expect(describeDecodeError({ kind: 'invalid-json', message: 'EOF' })).toMatch(/JSON/);
    expect(describeDecodeError({ kind: 'signature-invalid' })).toMatch(/Signature/);
    expect(
      describeDecodeError({ kind: 'schema-mismatch', got: '2.0.0', expected: '1.0.0' }),
    ).toMatch(/schema/);
    expect(describeDecodeError({ kind: 'missing-field', field: 'payload' })).toMatch(
      /missing/,
    );
    expect(
      describeDecodeError({ kind: 'required-marks-not-met', legLabel: 'Start' }),
    ).toMatch(/Start/);
    expect(
      describeDecodeError({
        kind: 'mark-ref-unknown',
        legLabel: 'Wind',
        markRef: 'm-x',
      }),
    ).toMatch(/Wind/);
  });
});
