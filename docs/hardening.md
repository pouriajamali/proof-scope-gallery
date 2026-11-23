# P5 boundaries

`verifyReceipt` checks signed domain/nonce binding, issuer trust, local key
revocation/activation, and credential validity. Crypto PASS with policy/binding
FAIL is retained; an expired or revoked authentic signature is not described as
cryptographically invalid. Invalid signature cases run through the real verifier.

`verifyOnce(input, store)` adds a separate replay result after all signature,
profile, binding and scope checks pass. Its key covers issuer, domain, request
and nonce and deliberately excludes key ID, so rotation cannot reset that nonce.
Invalid or unsupported receipts never consume a replay key.

`MemoryReplayStore` uses bounded synchronous check-and-consume in **one Node.js
process**. Two concurrent async callers are tested to yield one acceptance. Live
entries are not evicted at capacity; store failure/full/missing/async response and
backwards clock fail closed. Entries expire no earlier than credential expiry.

This is not durable or shared protection. Restart loses the map. Multiple
processes have separate maps. Production use needs an independently implemented
atomic storage adapter, time/retention policy and crash/multi-worker tests;
CMP-02 is not implemented here. The verifier clock, trust configuration and
expected context are trusted relying-party inputs. Local key revocation is not a
live credential-status-list or global identity revocation service.

The basic gallery intentionally uses stateless `verifyReceipt` so that exported
synthetic witnesses can be replayed as educational examples. Applications that
must consume once must call `verifyOnce` and supply their own suitable store.
No external security audit or production assurance is claimed.
