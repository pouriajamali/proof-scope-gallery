import { isDeepStrictEqual } from 'node:util';
import { validBinding, verifyReceipt, sha256 } from './profile.mjs';

export const PAYMENT_SCHEMA = 'g6-payment-observation/0.1.0';
export const INTENT_SCHEMA = 'g6-authorized-intent/0.1.0';
const integer = x => typeof x === 'string' && /^(0|[1-9][0-9]{0,39})$/.test(x);
const sameMoney = (a, b) => a?.asset === b?.asset && a?.unit === b?.unit && integer(a?.amount) && a.amount === b?.amount;

/** These are G6-owned boundary fixtures, not upstream CMP-02 storage or policy enforcement. */
export function assessIntent({ expected, grant }) {
  const denied = reason => ({ authorized: false, reason, enforcement: 'offline-check-only' });
  if (!validBinding(expected) || grant?.schema !== INTENT_SCHEMA || grant?.decision !== 'allow') return denied('Missing or unsupported local authorization statement');
  if (!isDeepStrictEqual(grant.expected, expected)) return denied('Authorized intent does not bind the complete expected request');
  if (grant.asset !== expected.charge.asset || grant.unit !== expected.charge.unit) return denied('Cost unit/asset mismatch');
  if (![grant.spentAtomic, grant.openReservedAtomic, grant.totalCapAtomic, grant.perRequestCapAtomic].every(integer)) return denied('Invalid exact integer cost policy');
  const charge = BigInt(expected.charge.amount);
  if (charge > BigInt(grant.perRequestCapAtomic)) return denied('Per-request cost cap exceeded');
  if (BigInt(grant.spentAtomic) + BigInt(grant.openReservedAtomic) + charge > BigInt(grant.totalCapAtomic)) return denied('Spent plus existing open reservations plus candidate charge exceeds total cap');
  return { authorized: true, reason: 'Complete intent and exact-unit cost fit the supplied offline policy statement', enforcement: 'offline-check-only' };
}

export async function assessService({ verificationInput, response, paymentObservation, grant }) {
  const verification = await verifyReceipt({ ...verificationInput, claim: 'output-binding', outputBytes: response?.outputBytes });
  const expected = verificationInput.expected;
  let payment = 'unknown';
  if (paymentObservation) {
    if (paymentObservation.schema !== PAYMENT_SCHEMA) payment = 'unsupported-observation';
    else if (paymentObservation.requestId !== expected?.requestId || !sameMoney(paymentObservation, expected?.charge)) payment = 'binding-mismatch';
    else if (['reported-settled', 'reported-failed', 'unknown'].includes(paymentObservation.state)) payment = paymentObservation.state;
    else payment = 'unsupported-observation';
  }
  let service = 'rejected';
  if (response?.state === 'missing' || !response) service = 'missing';
  else if (response.state === 'failed') service = 'failed';
  else if (response.state === 'succeeded' && verification.accepted) service = 'bound-signed-output';
  const authorization = assessIntent({ expected, grant });
  return { schema: 'g6-service-assessment/0.1.0', requestId: expected?.requestId,
    payment, service, authorization,
    serviceAuthorizedAndBound: service === 'bound-signed-output' && authorization.authorized,
    execution: 'issuer-asserted', quality: 'not-proven', paymentSettlement: 'not-independently-verified',
    verification, nativePaymentObservation: paymentObservation ?? null };
}

/** Preserve a native conformance observation without upgrading verify into execute. */
export function retainConformanceObservation(evidence) {
  const retained = structuredClone(evidence);
  return { schema: 'g6-conformance-consumer/0.1.0', nativeEvidence: retained,
    messageVerification: 'not-evaluated-by-this-profile', actionExecution: 'not-proven',
    deliveredAsset: 'not-proven', reason: 'Upstream CMP-03 profile/version/trust semantics require a separately implemented adapter' };
}

/** G2 trace 1.0 intentionally does not understand this proof type. Never relabel it synthetic. */
export function g2TraceBoundary({ requestId, outputBytes, result }) {
  return { requestId, outputDigest: sha256(outputBytes), verificationType: result.profile,
    state: result.accepted ? 'boundSignedOutput' : 'rejected',
    compatibility: { traceVersion: '1.0', profile: 'lifi-status-observation-v1', status: 'unsupported-verification-type',
      reason: 'Current G2 contract accepts synthetic-declaration only; owner-coordinated schema evolution is required' },
    verification: structuredClone(result) };
}
