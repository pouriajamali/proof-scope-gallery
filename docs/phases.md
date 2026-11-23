# Delivery evidence and remaining gates

| Scope | State | Evidence / remaining gate |
| --- | --- | --- |
| G6 P0 | VERIFIED | Existing VC verifier selected; [claim matrix](profile.md) |
| G6 P1 | VERIFIED locally | Real Ed25519 signature check, independent native cross-check; 21 tests at P1 |
| G6 P2 | VERIFIED | 23 tests and 8/8 scenarios; [CI 45190733281](https://github.com/pouriajamali/proof-scope-gallery/actions/runs/45190733281) on commit 336d5588ef319cc192f07e0b8d5fea4077213318 |
| G6 P3 / CMP-06 P2/P3 | In local verification | Versioned G6-owned service/intent/payment adapters; current G2 wire type unsupported, independent adoption pending |
| G6 P4 / CMP-06 P4 | PLANNED | Held-out AI classification vs deterministic checker; actual run, cost and attribution required |
| G6 P5 / CMP-06 P5 | PLANNED | Replay/domain/expiry/rotation and separate crypto/binding negatives |
| G6 P6 / CMP-06 P6 | PLANNED | Independent consumer before second profile; maintenance and contribution |

CMP-06 P0/P1 are covered by the claim matrix and signature/binding fixtures.
CMP-06 P2/P3 are not inferred from a gallery. CMP-02 and CMP-03 remain owned by
G2; this repository does not certify upstream phases, financial atomicity or
cross-chain conformance. Their integration begins with versioned offline data.

Numbers above describe bounded synthetic tests, not error rates or AI advantage.
Local test success is not CI, release download, external audit or independent use.
