import test from 'node:test';
import assert from 'node:assert/strict';
import { verify as nativeVerify } from 'node:crypto';
import { exportSPKI } from 'jose';
import { verifyReceipt, sha256 } from '../src/profile.mjs';
import { fixtureSigner, credentialFixture, expectedFixture, tamperPayload, NOW, bytes } from '../src/fixtures.mjs';

const signer = await fixtureSigner();
const credential = credentialFixture();
const token = await signer.sign(credential);
const expected = expectedFixture();
const run = overrides => verifyReceipt({ token, expected, now: NOW, trustedKeys: signer.trustedKeys, ...overrides });

test('valid signature cross-checks against independent node:crypto verifier', async () => {
  const [header, payload, signature] = token.split('.');
  assert.equal(nativeVerify(null, Buffer.from(`${header}.${payload}`), await exportSPKI(signer.publicKey), Buffer.from(signature, 'base64url')), true);
  const result = await run();
  assert.equal(result.signature.status, 'PASS');
  assert.equal(result.binding.status, 'PASS');
  assert.equal(result.accepted, true);
});

test('tampered output fails real signature check, binding is not run', async () => {
  const result = await run({ token: tamperPayload(token) });
  assert.equal(result.signature.status, 'FAIL');
  assert.equal(result.binding.status, 'NOT_RUN');
  assert.equal(result.accepted, false);
});

test('valid signature for task B is rejected for task A', async () => {
  const wrong = credentialFixture();
  wrong.credentialSubject.id = wrong.credentialSubject.serviceReceipt.requestId = 'urn:task:B';
  const result = await run({ token: await signer.sign(wrong) });
  assert.equal(result.signature.status, 'PASS');
  assert.equal(result.credential.status, 'PASS');
  assert.equal(result.binding.status, 'FAIL');
  assert.equal(result.accepted, false);
});

for (const [name, value] of [
  ['model', { id: 'urn:model:other', version: '1.0.0' }],
  ['inputDigest', sha256(bytes('different input'))],
  ['outputDigest', sha256(bytes('different output'))],
  ['code', { version: 'different', digest: sha256(bytes('different code')) }],
  ['charge', { asset: 'USD', unit: 'microusd', amount: '3' }],
  ['quote', { id: 'urn:quote:B', asset: 'USD', unit: 'microusd', amount: '3' }],
]) {
  test(`signed wrong ${name} fails binding, not crypto`, async () => {
    const c = credentialFixture(); c.credentialSubject.serviceReceipt[name] = value;
    const result = await run({ token: await signer.sign(c) });
    assert.equal(result.signature.status, 'PASS');
    assert.equal(result.binding.status, 'FAIL');
    assert.equal(result.accepted, false);
  });
}

for (const claim of ['correct-execution', 'quality', 'data-rights', 'hardware-attestation', 'payment-settlement']) {
  test(`${claim} remains unsupported despite valid crypto and matching request`, async () => {
    const result = await run({ claim });
    assert.equal(result.signature.status, 'PASS');
    assert.equal(result.binding.status, 'PASS');
    assert.equal(result.scope.status, 'UNSUPPORTED');
    assert.equal(result.accepted, false);
  });
}

test('output-binding requires actual supplied bytes', async () => {
  assert.equal((await run({ claim: 'output-binding', outputBytes: bytes('HELLO') })).accepted, true);
  assert.equal((await run({ claim: 'output-binding', outputBytes: bytes('WRONG') })).accepted, false);
  assert.equal((await run({ claim: 'output-binding' })).accepted, false);
});

test('incomplete expected context is rejected instead of weakening binding', async () => {
  const incomplete = { ...expected }; delete incomplete.model;
  const result = await run({ expected: incomplete });
  assert.equal(result.signature.status, 'NOT_RUN');
  assert.equal(result.accepted, false);
});

test('unknown key and wrong configured public key cannot authenticate', async () => {
  assert.equal((await run({ trustedKeys: [] })).accepted, false);
  const other = await fixtureSigner();
  const result = await run({ trustedKeys: other.trustedKeys });
  assert.equal(result.signature.status, 'FAIL');
  assert.equal(result.accepted, false);
});

test('alg none is rejected by existing verifier algorithm allowlist', async () => {
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none', kid: signer.trustedKeys[0].kid })).toString('base64url')}.${token.split('.')[1]}.`;
  assert.equal((await run({ token: unsigned })).signature.status, 'FAIL');
});

test('signed unsupported credential extension cannot silently bypass profile', async () => {
  const c = credentialFixture(); c.credentialStatus = { id: 'https://untrusted.example/status', type: 'UnknownStatus' };
  const result = await run({ token: await signer.sign(c) });
  assert.equal(result.signature.status, 'PASS');
  assert.equal(result.credential.status, 'FAIL');
  assert.equal(result.accepted, false);
});

test('signed non-JSON payload and malformed/oversized tokens fail closed', async () => {
  const result = await run({ token: await signer.signBytes(bytes('not JSON')) });
  assert.equal(result.signature.status, 'PASS');
  assert.equal(result.credential.status, 'FAIL');
  assert.equal(result.accepted, false);
  for (const candidate of ['', 'bad.token', 'x'.repeat(65537)]) {
    assert.equal((await run({ token: candidate })).accepted, false);
  }
});

test('valid signature with wrong media type or issuer remains rejected', async () => {
  const media = await run({ token: await signer.sign(credential, { typ: 'JWT' }) });
  assert.equal(media.signature.status, 'PASS');
  assert.equal(media.credential.status, 'FAIL');
  const c = credentialFixture(); c.issuer = 'https://other.example.test';
  const issuer = await run({ token: await signer.sign(c) });
  assert.equal(issuer.signature.status, 'PASS');
  assert.equal(issuer.credential.status, 'FAIL');
});
