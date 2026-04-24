/**
 * ECDSA P-256 (secp256r1) signing primitives for committee-boat course
 * push. Pure JS via @noble/curves so this works identically on-device in
 * React Native and in Node for tests — no native module required.
 *
 * Why P-256: it's the SAP Buoy Pinger curve (and the Web Crypto default),
 * so keys generated here interoperate with anyone running the SAP schema
 * directly. Signatures are 64-byte raw (r || s), encoded as base64url
 * for transport.
 */

import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';

export interface KeyPair {
  /** base64url-encoded raw 32-byte private scalar. */
  privateKey: string;
  /** base64url-encoded uncompressed 65-byte public point (0x04 || X || Y). */
  publicKey: string;
}

const textEncoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  // Avoid Buffer for React Native compatibility.
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof globalThis.btoa === 'function'
      ? globalThis.btoa(binary)
      : // Node fallback
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('buffer') as typeof import('buffer')).Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 =
    b64url.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (b64url.length % 4)) % 4);
  const binary =
    typeof globalThis.atob === 'function'
      ? globalThis.atob(b64)
      : // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('buffer') as typeof import('buffer')).Buffer.from(b64, 'base64').toString(
          'binary',
        );
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/** Generate a fresh P-256 keypair. */
export function generateKeyPair(): KeyPair {
  const privateRaw = p256.utils.randomSecretKey();
  const publicRaw = p256.getPublicKey(privateRaw, false); // uncompressed
  return {
    privateKey: bytesToBase64Url(privateRaw),
    publicKey: bytesToBase64Url(publicRaw),
  };
}

/** Derive the public key from a base64url-encoded private key. */
export function derivePublicKey(privateKeyB64: string): string {
  const privateRaw = base64UrlToBytes(privateKeyB64);
  const publicRaw = p256.getPublicKey(privateRaw, false);
  return bytesToBase64Url(publicRaw);
}

/** Sign a UTF-8 message with a base64url-encoded private key. */
export function sign(message: string, privateKeyB64: string): string {
  const privateRaw = base64UrlToBytes(privateKeyB64);
  const digest = sha256(textEncoder.encode(message));
  const sig = p256.sign(digest, privateRaw); // Uint8Array, 64 bytes raw
  return bytesToBase64Url(sig);
}

/**
 * Verify a signature against message + public key. Returns true iff the
 * signature is syntactically valid AND matches. Never throws on bad
 * input — malformed keys or signatures resolve to `false`.
 */
export function verify(
  message: string,
  signatureB64: string,
  publicKeyB64: string,
): boolean {
  try {
    const publicRaw = base64UrlToBytes(publicKeyB64);
    const sigRaw = base64UrlToBytes(signatureB64);
    const digest = sha256(textEncoder.encode(message));
    return p256.verify(sigRaw, digest, publicRaw);
  } catch {
    return false;
  }
}

/** Test-only helpers re-exported for sister modules. */
export const __coder = { bytesToBase64Url, base64UrlToBytes };
