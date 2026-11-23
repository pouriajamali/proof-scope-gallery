import { verifyReceipt, sha256 } from './profile.mjs';

/** Bounded, synchronous check-and-consume for ONE process. Not durable/shared storage. */
export class MemoryReplayStore {
  #entries = new Map();
  #lastNow = -Infinity;
  constructor({ maxEntries = 1000 } = {}) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new Error('Invalid replay capacity');
    this.maxEntries = maxEntries;
  }
  consume(key, expiresAt, now) {
    if (!Number.isFinite(now) || !Number.isFinite(expiresAt) || now < this.#lastNow || expiresAt <= now) {
      return { accepted: false, reason: 'Invalid or backwards replay-store clock/expiry' };
    }
    this.#lastNow = now;
    for (const [k, expiry] of this.#entries) if (expiry <= now) this.#entries.delete(k);
    if (this.#entries.has(key)) return { accepted: false, reason: 'Request/domain/nonce already consumed' };
    // Never evict live entries to make room: that would permit replay.
    if (this.#entries.size >= this.maxEntries) return { accepted: false, reason: 'Replay store full; fail closed' };
    this.#entries.set(key, expiresAt);
    return { accepted: true, reason: 'First use consumed in this process-local store' };
  }
}

export async function verifyOnce(input, replayStore) {
  const result = await verifyReceipt(input);
  result.replay = { status: 'NOT_RUN', reason: 'Only a fully accepted scoped receipt may consume a nonce' };
  if (!result.accepted) return result;
  if (!replayStore || typeof replayStore.consume !== 'function') {
    result.accepted = false;
    result.replay = { status: 'FAIL', reason: 'A replay store is required' };
    return result;
  }
  const credential = result.publicCredential;
  const receipt = credential.credentialSubject.serviceReceipt;
  const key = sha256(Buffer.from(JSON.stringify(['g6-once/0.1.0', credential.issuer, receipt.domain, receipt.requestId, receipt.nonce])));
  let consumed;
  try { consumed = replayStore.consume(key, Date.parse(credential.validUntil), Date.parse(input.now)); }
  catch { consumed = { accepted: false, reason: 'Replay store failure' }; }
  // This interface is deliberately synchronous. An async durable store requires its own adapter/tests.
  const ok = consumed?.accepted === true && typeof consumed?.reason === 'string';
  result.replay = { status: ok ? 'PASS' : 'FAIL', reason: consumed?.reason ?? 'Unsupported replay-store response' };
  result.accepted = ok;
  return result;
}
