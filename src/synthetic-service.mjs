import { readFile } from 'node:fs/promises';
import { credentialFixture, expectedFixture, fixtureSigner, NOW, bytes } from './fixtures.mjs';
import { sha256 } from './profile.mjs';
import { INTENT_SCHEMA, PAYMENT_SCHEMA, assessService } from './adapters.mjs';

export async function syntheticServiceExample(mode = 'valid') {
  if (!['valid', 'missing', 'failed', 'wrong-output', 'wrong-request', 'over-budget', 'denied', 'unpaid'].includes(mode)) throw new Error('Unknown synthetic mode');
  const inputBytes = bytes('hello');
  const outputBytes = bytes(new TextDecoder().decode(inputBytes).toUpperCase());
  const credential = credentialFixture();
  const receipt = credential.credentialSubject.serviceReceipt;
  receipt.inputDigest = sha256(inputBytes); receipt.outputDigest = sha256(outputBytes);
  receipt.code.digest = sha256(await readFile(new URL('./synthetic-service.mjs', import.meta.url)));
  const expected = expectedFixture(credential);
  const signer = await fixtureSigner();
  if (mode === 'wrong-request') credential.credentialSubject.id = receipt.requestId = 'urn:task:B';
  const token = await signer.sign(credential);
  const grant = { schema: INTENT_SCHEMA, decision: mode === 'denied' ? 'deny' : 'allow', expected,
    asset: 'USD', unit: 'microusd', spentAtomic: '1', openReservedAtomic: mode === 'over-budget' ? '9' : '2', totalCapAtomic: '10', perRequestCapAtomic: '3' };
  const paymentObservation = { schema: PAYMENT_SCHEMA, requestId: expected.requestId,
    ...expected.charge, state: mode === 'unpaid' ? 'unknown' : 'reported-settled',
    native: { source: 'synthetic-local-fixture', observationId: `payment-${mode}` } };
  const response = { state: ['missing', 'failed'].includes(mode) ? mode : 'succeeded',
    outputBytes: mode === 'missing' ? undefined : mode === 'wrong-output' ? bytes('WRONG') : outputBytes };
  return assessService({ verificationInput: { token, expected, now: NOW, trustedKeys: signer.trustedKeys }, response, paymentObservation, grant });
}
