import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyReceipt } from '../src/profile.mjs';
import { MemoryReplayStore, verifyOnce } from '../src/replay.mjs';
import { fixtureSigner, credentialFixture, expectedFixture, NOW, KID, ISSUER, tamperPayload } from '../src/fixtures.mjs';

const signer = await fixtureSigner();
const c = credentialFixture();
const token = await signer.sign(c);
const input = { token, expected: expectedFixture(c), now: NOW, trustedKeys: signer.trustedKeys };

test('validity interval is inclusive-from and exclusive-until; crypto remains valid', async () => {
  for (const [now, accepted] of [
    ['2025-12-31T23:59:59.999Z', false],
    [c.validFrom, false],
    ['2026-01-02T23:59:59.999Z', true],
    [c.validUntil, false],
  ]) {
    const r = await verifyReceipt({ ...input, now });
    assert.equal(r.signature.status, 'PASS');
    assert.equal(r.accepted, accepted);
    if (!accepted) assert.equal(r.credential.status, 'FAIL');
  }
});

test('valid-from boundary succeeds when observation time is also valid; future observations fail policy', async () => {
  const boundary = credentialFixture(); boundary.credentialSubject.serviceReceipt.observedAt = boundary.validFrom;
  assert.equal((await verifyReceipt({ ...input, token: await signer.sign(boundary), now: boundary.validFrom })).accepted, true);
  const future = credentialFixture(); future.credentialSubject.serviceReceipt.observedAt = '2026-01-02T12:00:01.000Z';
  const r = await verifyReceipt({ ...input, token: await signer.sign(future) });
  assert.equal(r.signature.status, 'PASS');
  assert.equal(r.credential.status, 'FAIL');
  assert.equal(r.accepted, false);
});

test('ambiguous/malformed trust configuration and noncanonical extended dates fail closed', async () => {
  for (const trustedKeys of [[null], [...signer.trustedKeys, ...signer.trustedKeys], [{ ...signer.trustedKeys[0], revoked: 'false' }]]) {
    assert.equal((await verifyReceipt({ ...input, trustedKeys })).accepted, false);
  }
  assert.equal((await verifyReceipt({ ...input, now: '+012026-01-02T12:00:00.000Z' })).accepted, false);
});

for (const [field, wrong] of [['domain', 'urn:other-relying-party'], ['nonce', 'different-nonce']]) {
  test(`valid signed ${field} mismatch fails binding`, async () => {
    const other = credentialFixture(); other.credentialSubject.serviceReceipt[field] = wrong;
    const r = await verifyReceipt({ ...input, token: await signer.sign(other) });
    assert.equal(r.signature.status, 'PASS');
    assert.equal(r.binding.status, 'FAIL');
    assert.equal(r.accepted, false);
  });
}

test('local revocation and key activation windows reject authentic signatures', async () => {
  for (const policy of [{ revoked: true }, { validFrom: '2026-01-03T00:00:00.000Z' }, { validUntil: NOW }]) {
    const r = await verifyReceipt({ ...input, trustedKeys: [{ ...signer.trustedKeys[0], ...policy }] });
    assert.equal(r.signature.status, 'PASS');
    assert.equal(r.credential.status, 'FAIL');
    assert.equal(r.accepted, false);
  }
});

test('rotation accepts new pinned key, retains old-key rejection and prevents nonce reuse across keys', async () => {
  const fresh = await fixtureSigner(); const newKid = `${ISSUER}/keys/rotated`;
  const trustedKeys = [
    { ...signer.trustedKeys[0], kid: KID, revoked: true },
    { kid: newKid, issuer: ISSUER, publicKey: fresh.publicKey },
  ];
  const newInput = { ...input, trustedKeys, token: await fresh.sign(c, { kid: newKid }) };
  assert.equal((await verifyReceipt(newInput)).accepted, true);
  const old = await verifyReceipt({ ...input, trustedKeys });
  assert.equal(old.signature.status, 'PASS'); assert.equal(old.accepted, false);
  const store = new MemoryReplayStore();
  assert.equal((await verifyOnce(input, store)).accepted, true);
  const repeated = await verifyOnce(newInput, store);
  assert.equal(repeated.signature.status, 'PASS');
  assert.equal(repeated.replay.status, 'FAIL');
  assert.equal(repeated.accepted, false);
});

test('concurrent callers in one process cannot both consume the same nonce', async () => {
  const store = new MemoryReplayStore();
  const results = await Promise.all([verifyOnce(input, store), verifyOnce(input, store)]);
  assert.equal(results.filter(r => r.accepted).length, 1);
  assert.equal(results.filter(r => r.signature.status === 'PASS').length, 2);
  assert.equal(results.filter(r => r.replay.status === 'FAIL').length, 1);
});

test('invalid crypto and invalid binding cannot poison replay state', async () => {
  const store = new MemoryReplayStore();
  const badCrypto = await verifyOnce({ ...input, token: tamperPayload(token) }, store);
  assert.equal(badCrypto.signature.status, 'FAIL');
  assert.equal(badCrypto.replay.status, 'NOT_RUN');
  const badBinding = await verifyOnce({ ...input, expected: { ...input.expected, nonce: 'wrong' } }, store);
  assert.equal(badBinding.signature.status, 'PASS');
  assert.equal(badBinding.binding.status, 'FAIL');
  assert.equal(badBinding.replay.status, 'NOT_RUN');
  assert.equal((await verifyOnce(input, store)).accepted, true);
});

test('store capacity, failure, missing store, backwards clock and asynchronous stores fail closed', async () => {
  const store = new MemoryReplayStore({ maxEntries: 1 });
  assert.equal((await verifyOnce(input, store)).accepted, true);
  const other = credentialFixture(); other.credentialSubject.serviceReceipt.nonce = 'fresh-nonce';
  const otherInput = { ...input, token: await signer.sign(other), expected: expectedFixture(other) };
  assert.equal((await verifyOnce(otherInput, store)).accepted, false);
  assert.equal((await verifyOnce(input)).accepted, false);
  assert.equal((await verifyOnce(input, { consume() { throw new Error('storage down'); } })).accepted, false);
  assert.equal((await verifyOnce(input, { async consume() { return { accepted: true, reason: 'not supported' }; } })).accepted, false);
  assert.equal(store.consume('x', Date.parse(c.validUntil), Date.parse('2026-01-01T00:00:00.000Z')).accepted, false);
});

test('expired entries can be pruned without evicting a live replay barrier', () => {
  const store = new MemoryReplayStore({ maxEntries: 1 });
  assert.equal(store.consume('a', 20, 10).accepted, true);
  assert.equal(store.consume('b', 30, 19).accepted, false);
  assert.equal(store.consume('b', 30, 20).accepted, true);
  assert.equal(store.consume('b', 30, 21).accepted, false);
});
