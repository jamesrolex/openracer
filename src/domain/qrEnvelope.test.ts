import { generateKeyPair } from './committeeKey';
import { buildBundle } from './coursePush';
import {
  decodeQr,
  describeQrDecodeError,
  encodeBundleQr,
  encodeTrustQr,
} from './qrEnvelope';

describe('qrEnvelope', () => {
  const trustEntry = {
    committeeId: 'abersoch-sc',
    committeeName: 'Abersoch SC',
    publicKey: 'pretend-pub-key',
  };

  it('encodes + decodes a trust QR', () => {
    const raw = encodeTrustQr(trustEntry);
    const result = decodeQr(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.kind).toBe('openracer-trust');
    if (result.envelope.kind === 'openracer-trust') {
      expect(result.envelope.trust.committeeId).toBe('abersoch-sc');
    }
  });

  it('encodes + decodes a bundle QR', () => {
    const kp = generateKeyPair();
    const bundle = buildBundle({
      course: {
        id: 'c',
        name: 'x',
        templateId: 'windward-leeward',
        state: 'armed',
        createdAt: '2026-04-24T12:00:00Z',
        updatedAt: '2026-04-24T12:00:00Z',
        legs: [
          {
            id: 'l',
            type: 'windward',
            label: 'W',
            markIds: ['m'],
            requiredMarks: 1,
            rounding: 'port',
          },
        ],
      },
      marks: [
        {
          id: 'm',
          name: 'Y',
          latitude: 52.8,
          longitude: -4.5,
          tier: 'club-seasonal',
          source: 'club-library',
          icon: 'custom',
          shape: 'unknown',
          validFrom: null,
          validUntil: null,
          owner: 'O',
          confidence: 0.9,
        },
      ],
      committeeId: 'abersoch-sc',
      committeeName: 'Abersoch SC',
      privateKey: kp.privateKey,
    });
    const raw = encodeBundleQr(bundle);
    const result = decodeQr(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.kind).toBe('openracer-bundle');
  });

  it('rejects non-JSON content', () => {
    const result = decodeQr('not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-json');
  });

  it('rejects a QR from a different app', () => {
    const raw = JSON.stringify({ kind: 'some-other-app', url: 'x' });
    const result = decodeQr(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not-openracer');
  });

  it('rejects mismatched envelope version', () => {
    const raw = JSON.stringify({
      kind: 'openracer-trust',
      version: '99.0.0',
      trust: trustEntry,
    });
    const result = decodeQr(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('version-mismatch');
  });

  it('describes each error kind in plain English', () => {
    expect(describeQrDecodeError({ kind: 'invalid-json', message: 'x' })).toMatch(/JSON/);
    expect(describeQrDecodeError({ kind: 'not-openracer', got: 'x' })).toMatch(/OpenRacer/);
    expect(
      describeQrDecodeError({ kind: 'version-mismatch', got: '2.0', expected: '1.0' }),
    ).toMatch(/version/);
    expect(describeQrDecodeError({ kind: 'missing-field', field: 'bundle' })).toMatch(
      /missing/,
    );
  });
});
