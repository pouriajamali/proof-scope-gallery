import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { compactVerify, decodeProtectedHeader } from 'jose';

export const PROFILE = 'vc-jws-eddsa-receipt/0.1.0';
export const RECEIPT_SCHEMA = 'service-receipt/0.1.0';
export const CONTEXT = [
  'https://www.w3.org/ns/credentials/v2',
  { serviceReceipt: { '@id': 'urn:proof-scope:serviceReceipt', '@type': '@json' } },
];
export const TYPES = ['VerifiableCredential', 'urn:proof-scope:ServiceReceiptCredential'];
export const BINDING_FIELDS = [
  'requestId', 'inputDigest', 'outputDigest', 'model', 'code', 'quote', 'charge', 'domain', 'nonce',
];
export const SUPPORTED_CLAIMS = ['issuer-statement', 'request-binding', 'output-binding'];
export const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const text = x => typeof x === 'string' && x.length > 0 && x.length <= 1024;
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = (x, required, optional = []) => record(x)
  && required.every(k => Object.hasOwn(x, k))
  && Object.keys(x).every(k => [...required, ...optional].includes(k));
const digest = x => typeof x === 'string' && /^sha256:[a-f0-9]{64}$/.test(x);
const amount = x => typeof x === 'string' && /^(0|[1-9][0-9]{0,39})$/.test(x);
const money = x => keys(x, ['asset', 'unit', 'amount'])
  && text(x.asset) && text(x.unit) && amount(x.amount);
const instant = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x))
  && new Date(x).toISOString() === x;
const namedVersion = x => keys(x, ['id', 'version']) && text(x.id) && text(x.version);
const codeVersion = x => keys(x, ['version', 'digest']) && text(x.version) && digest(x.digest);
const quote = x => keys(x, ['id', 'asset', 'unit', 'amount']) && text(x.id)
  && money({ asset: x.asset, unit: x.unit, amount: x.amount });

export function validBinding(x) {
  return keys(x, BINDING_FIELDS) && text(x.requestId) && digest(x.inputDigest)
    && digest(x.outputDigest) && namedVersion(x.model) && codeVersion(x.code)
    && quote(x.quote) && money(x.charge) && text(x.domain) && text(x.nonce);
}

export function validReceipt(x) {
  if (!keys(x, ['schema', ...BINDING_FIELDS, 'observedAt', 'execution'])) return false;
  const binding = Object.fromEntries(BINDING_FIELDS.map(k => [k, x[k]]));
  return x.schema === RECEIPT_SCHEMA && validBinding(binding) && instant(x.observedAt)
    && keys(x.execution, ['type', 'status']) && x.execution.type === 'issuer-asserted'
    && x.execution.status === 'succeeded';
}

export function validCredential(c) {
  return keys(c, ['@context', 'id', 'type', 'issuer', 'validFrom', 'validUntil', 'credentialSubject'], ['iss'])
    && isDeepStrictEqual(c['@context'], CONTEXT) && isDeepStrictEqual(c.type, TYPES)
    && text(c.id) && text(c.issuer) && (!Object.hasOwn(c, 'iss') || c.iss === c.issuer)
    && instant(c.validFrom) && instant(c.validUntil) && c.validFrom < c.validUntil
    && keys(c.credentialSubject, ['id', 'serviceReceipt'])
    && c.credentialSubject.id === c.credentialSubject.serviceReceipt?.requestId
    && validReceipt(c.credentialSubject.serviceReceipt)
    && c.credentialSubject.serviceReceipt.observedAt >= c.validFrom
    && c.credentialSubject.serviceReceipt.observedAt < c.validUntil;
}

const layer = (status, reason) => ({ status, reason });

/** Verify a constrained VC profile. Caller supplies trust and the full expected context.
 * No token-provided key material or network key resolution is accepted.
 */
export async function verifyReceipt({ token, trustedKeys, expected, now, claim = 'request-binding', outputBytes }) {
  const result = {
    profile: PROFILE,
    accepted: false,
    signature: layer('NOT_RUN', 'No cryptographic result yet'),
    credential: layer('NOT_RUN', 'No trusted credential yet'),
    binding: layer('NOT_RUN', 'No verified fields yet'),
    scope: SUPPORTED_CLAIMS.includes(claim)
      ? layer('SUPPORTED', claim)
      : layer('UNSUPPORTED', `This signature profile does not prove ${String(claim)}`),
    limitations: ['Issuer assertions do not prove execution, quality, data rights or payment settlement.'],
  };
  if (!validBinding(expected) || !instant(now) || !Array.isArray(trustedKeys)
    || !trustedKeys.every(k => record(k) && text(k.kid) && text(k.issuer)
      && (!Object.hasOwn(k, 'revoked') || typeof k.revoked === 'boolean'))) {
    result.credential = layer('FAIL', 'Invalid verifier configuration or incomplete expected context');
    return result;
  }
  if (typeof token !== 'string' || token.length > 65536) {
    result.signature = layer('FAIL', 'Malformed or oversized compact JWS');
    return result;
  }
  let header;
  try { header = decodeProtectedHeader(token); }
  catch { result.signature = layer('FAIL', 'Malformed compact JWS'); return result; }
  const entries = trustedKeys.filter(k => k.kid === header.kid);
  if (entries.length !== 1 || !text(header.kid)) {
    result.credential = layer('FAIL', 'Unknown or ambiguous key identifier');
    return result;
  }
  const key = entries[0];
  let verified;
  try {
    verified = await compactVerify(token, key.publicKey, { algorithms: ['EdDSA'] });
    result.signature = layer('PASS', 'jose compactVerify accepted the Ed25519 signature');
  } catch (error) {
    result.signature = layer('FAIL', error.code ?? 'Signature verification failed');
    return result;
  }
  // A valid signature does not establish this profile or local trust policy.
  if (!keys(header, ['alg', 'kid', 'typ', 'cty']) || header.typ !== 'vc+jwt' || header.cty !== 'vc') {
    result.credential = layer('FAIL', 'Unsupported protected header profile');
    return result;
  }
  let credential;
  try { credential = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(verified.payload)); }
  catch { result.credential = layer('FAIL', 'Invalid credential JSON/UTF-8'); return result; }
  if (!validCredential(credential)) {
    result.credential = layer('FAIL', 'Credential is outside the constrained profile');
    return result;
  }
  result.publicCredential = credential;
  if (credential.issuer !== key.issuer || key.revoked === true) {
    result.credential = layer('FAIL', 'Issuer mismatch or locally revoked key');
    return result;
  }
  if (now < credential.validFrom || now >= credential.validUntil) {
    result.credential = layer('FAIL', 'Credential not yet valid or expired');
    return result;
  }
  if (credential.credentialSubject.serviceReceipt.observedAt > now) {
    result.credential = layer('FAIL', 'Receipt observation is in the future');
    return result;
  }
  if (key.validFrom && (!instant(key.validFrom) || now < key.validFrom)) {
    result.credential = layer('FAIL', 'Key not active'); return result;
  }
  if (key.validUntil && (!instant(key.validUntil) || now >= key.validUntil)) {
    result.credential = layer('FAIL', 'Key no longer active'); return result;
  }
  result.credential = layer('PASS', 'Pinned issuer/key and local validity policy accepted');
  const receipt = credential.credentialSubject.serviceReceipt;
  const mismatches = BINDING_FIELDS.filter(field => !isDeepStrictEqual(receipt[field], expected[field]));
  if (claim === 'output-binding' && (!(outputBytes instanceof Uint8Array) || sha256(outputBytes) !== receipt.outputDigest)) {
    mismatches.push('outputBytes');
  }
  result.binding = mismatches.length
    ? layer('FAIL', `Mismatched fields: ${mismatches.join(', ')}`)
    : layer('PASS', 'All expected public fields matched');
  result.accepted = result.binding.status === 'PASS' && result.scope.status === 'SUPPORTED';
  return result;
}
