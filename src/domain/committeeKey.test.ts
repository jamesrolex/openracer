import { generateKeyPair, sign, verify } from './committeeKey';

describe('committeeKey', () => {
  it('generates a keypair with the right base64url lengths', () => {
    const kp = generateKeyPair();
    // 32-byte private → 43 chars base64url (no padding).
    expect(kp.privateKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(kp.privateKey.length).toBe(43);
    // 65-byte public (uncompressed P-256) → 87 chars base64url.
    expect(kp.publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(kp.publicKey.length).toBe(87);
  });

  it('round-trip: sign then verify with the same keypair', () => {
    const kp = generateKeyPair();
    const msg = '{"hello":"world","n":1}';
    const sig = sign(msg, kp.privateKey);
    expect(verify(msg, sig, kp.publicKey)).toBe(true);
  });

  it('rejects a signature from a different key', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    const msg = 'test';
    const sigA = sign(msg, a.privateKey);
    expect(verify(msg, sigA, b.publicKey)).toBe(false);
  });

  it('rejects a signature when the message is tampered', () => {
    const kp = generateKeyPair();
    const sig = sign('original', kp.privateKey);
    expect(verify('tampered', sig, kp.publicKey)).toBe(false);
  });

  it('malformed signature returns false, never throws', () => {
    const kp = generateKeyPair();
    expect(verify('msg', 'not-valid-b64!!!', kp.publicKey)).toBe(false);
    expect(verify('msg', '', kp.publicKey)).toBe(false);
  });

  it('malformed public key returns false, never throws', () => {
    const kp = generateKeyPair();
    const sig = sign('msg', kp.privateKey);
    expect(verify('msg', sig, 'garbage')).toBe(false);
  });
});
