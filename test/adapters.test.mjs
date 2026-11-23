import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticServiceExample } from '../src/synthetic-service.mjs';
import { retainConformanceObservation, g2TraceBoundary, assessIntent, INTENT_SCHEMA } from '../src/adapters.mjs';
import { expectedFixture, bytes } from '../src/fixtures.mjs';

const oracle = {
  valid: ['reported-settled', 'bound-signed-output', true, true],
  missing: ['reported-settled', 'missing', true, false],
  failed: ['reported-settled', 'failed', true, false],
  'wrong-output': ['reported-settled', 'rejected', true, false],
  'wrong-request': ['reported-settled', 'rejected', true, false],
  'over-budget': ['reported-settled', 'bound-signed-output', false, false],
  denied: ['reported-settled', 'bound-signed-output', false, false],
  unpaid: ['unknown', 'bound-signed-output', true, true],
};
for (const [mode, expected] of Object.entries(oracle)) {
  test(`synthetic service ${mode}: payment, service, permission remain separate`, async () => {
    const r = await syntheticServiceExample(mode);
    assert.deepEqual([r.payment, r.service, r.authorization.authorized, r.serviceAuthorizedAndBound], expected);
    assert.equal(r.execution, 'issuer-asserted');
    assert.equal(r.quality, 'not-proven');
    assert.equal(r.paymentSettlement, 'not-independently-verified');
    if (mode === 'wrong-request') {
      assert.equal(r.verification.signature.status, 'PASS');
      assert.equal(r.verification.binding.status, 'FAIL');
    }
  });
}

test('exact cost arithmetic, unit and complete intent scope enforced offline', () => {
  const expected = expectedFixture();
  const grant = { schema: INTENT_SCHEMA, decision: 'allow', expected, asset: 'USD', unit: 'microusd', spentAtomic: '0', openReservedAtomic: '8', totalCapAtomic: '10', perRequestCapAtomic: '2' };
  assert.equal(assessIntent({ expected, grant }).authorized, true);
  for (const patch of [{ openReservedAtomic: '9' }, { perRequestCapAtomic: '1' }, { unit: 'usd' }, { spentAtomic: 0 }, { expected: { ...expected, nonce: 'other' } }]) {
    assert.equal(assessIntent({ expected, grant: { ...grant, ...patch } }).authorized, false);
  }
});

test('conformance verification does not establish execution or asset delivery', () => {
  const native = { profile: 'unintegrated', version: '0', trustConfig: { quorum: 'unknown' }, status: 'verified', newEnum: 'future', nested: { source: 'native' } };
  const r = retainConformanceObservation(native);
  assert.deepEqual(r.nativeEvidence, native);
  assert.equal(r.actionExecution, 'not-proven');
  assert.equal(r.deliveredAsset, 'not-proven');
  native.nested.source = 'changed';
  assert.equal(r.nativeEvidence.nested.source, 'native');
});

test('G2 boundary explicitly reports unsupported current trace contract, without dropping crypto type', async () => {
  const r = await syntheticServiceExample();
  const boundary = g2TraceBoundary({ requestId: r.requestId, outputBytes: bytes('HELLO'), result: r.verification });
  assert.equal(boundary.compatibility.status, 'unsupported-verification-type');
  assert.equal(boundary.verificationType, 'vc-jws-eddsa-receipt/0.1.0');
});
