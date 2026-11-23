import { CompactSign, generateKeyPair } from 'jose';
import { CONTEXT, TYPES, RECEIPT_SCHEMA, BINDING_FIELDS, sha256 } from './profile.mjs';

export const NOW = '2026-01-02T12:00:00.000Z';
export const ISSUER = 'https://issuer.example.test';
export const KID = `${ISSUER}/keys/demo-ed25519`;
export const bytes = x => new TextEncoder().encode(x);

export async function fixtureSigner() {
  // Ephemeral demo keys are generated locally, never written to disk or a report.
  const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
  const signBytes = (payload, header = {}) => new CompactSign(payload)
    .setProtectedHeader({ alg: 'EdDSA', kid: KID, typ: 'vc+jwt', cty: 'vc', ...header })
    .sign(privateKey);
  const sign = (credential, header = {}) => signBytes(bytes(JSON.stringify(credential)), header);
  return { sign, signBytes, publicKey, trustedKeys: [{ kid: KID, issuer: ISSUER, publicKey }] };
}

export function credentialFixture() {
  return {
    '@context': structuredClone(CONTEXT),
    id: 'urn:receipt:task-A',
    type: [...TYPES],
    issuer: ISSUER,
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2026-01-03T00:00:00.000Z',
    credentialSubject: {
      id: 'urn:task:A',
      serviceReceipt: {
        schema: RECEIPT_SCHEMA,
        requestId: 'urn:task:A',
        inputDigest: sha256(bytes('hello')),
        outputDigest: sha256(bytes('HELLO')),
        model: { id: 'urn:model:synthetic-uppercase', version: '1.0.0' },
        code: { version: 'synthetic-uppercase/1.0.0', digest: sha256(bytes('synthetic-example-code-marker')) },
        quote: { id: 'urn:quote:A', asset: 'USD', unit: 'microusd', amount: '3' },
        charge: { asset: 'USD', unit: 'microusd', amount: '2' },
        domain: 'urn:proof-scope:gallery',
        nonce: 'synthetic-nonce-A',
        observedAt: NOW,
        execution: { type: 'issuer-asserted', status: 'succeeded' },
      },
    },
  };
}

export function expectedFixture(c = credentialFixture()) {
  return structuredClone(Object.fromEntries(BINDING_FIELDS.map(k => [k, c.credentialSubject.serviceReceipt[k]])));
}

export function tamperPayload(token) {
  const parts = token.split('.');
  const c = JSON.parse(Buffer.from(parts[1], 'base64url'));
  c.credentialSubject.serviceReceipt.outputDigest = sha256(bytes('TAMPERED'));
  parts[1] = Buffer.from(JSON.stringify(c)).toString('base64url');
  return parts.join('.');
}
