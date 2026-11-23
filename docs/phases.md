# Delivery evidence and remaining gates

| Scope | State | Evidence / remaining gate |
| --- | --- | --- |
| G6 P0 | VERIFIED | Existing VC verifier selected; [claim matrix](profile.md) |
| G6 P1 | VERIFIED locally | Real Ed25519 signature check, independent native cross-check; 21 tests at P1 |
| G6 P2 | VERIFIED | 23 tests and 8/8 scenarios; [CI 45190733281](https://github.com/pouriajamali/proof-scope-gallery/actions/runs/45190733281) on commit 336d5588ef319cc192f07e0b8d5fea4077213318 |
| G6 P3 / CMP-06 P2/P3 | VERIFIED in offline boundary scope | 34/34 tests; [CI 45191740989](https://github.com/pouriajamali/proof-scope-gallery/actions/runs/45191740989); current G2 wire type unsupported and independent adoption deferred |
| G6 P4 / CMP-06 P4 | DEFERRED | [Protocol and guard](ai-evaluation.md) prepared; actual model/runtime/budget and empirical outputs absent |
| G6 P5 / CMP-06 P5 | VERIFIED locally, remote CI pending | 47/47 tests; process-local replay/domain/expiry/rotation and separate crypto/binding negatives; no durable or multi-process claim |
| G6 P6 / CMP-06 P6 | DEFERRED | [Independent consumer gate](independent-consumption.md) unmet; contribution/maintenance docs prepared; no second profile |

CMP-06 P0/P1 are covered by the claim matrix and signature/binding fixtures.
CMP-06 P2 is covered by the synthetic service/missing-result cases; P3 verifies
the real verifier and G6-owned consumer boundary only. Independent G2/G3 adoption
remains deferred; it is not inferred from a gallery or these local examples.

## Consumed complement gates, without taking ownership

G2 owns CMP-02 and CMP-03. G6 does not certify their phases or change their code.
The following P0–P6 gates remain required when actual consumption is implemented:

| Phase | CMP-02 consumption | CMP-03 consumption |
| --- | --- | --- |
| P0 | Audit semantics, asset/unit/precision and financial identity; no ledger baseline audited here | Pin one protocol, native lifecycle, version and trust config; current G2 provider contract inspected |
| P1 | Identity/conflict/reservation/refund expected cases from upstream owner | Native states and unknown enums preserved; verified is not executed |
| P2 | Offline adapter with effect/receipt reconciliation and idempotent retry | First native profile and evidence-backed offline conformance |
| P3 | Atomic total reservation with G3, actual storage tests, then G6 integration | Independent second profile and actual G6/G4 consumption |
| P4 | Actual AI triage against deterministic accounting and recorded cost | Actual AI scenario comparison with oracle and equal budget |
| P5 | Before/after commit crash, restart, duplicate and stale-worker invariants | Delay/duplicate/timeout/proof/finality/retry semantics and safe resend |
| P6 | Version migration, real consumer and affected dependency regression | Demand-driven SDK/profile update, migration and prior-version regression |

G6 currently provides boundary fixtures and explicit unsupported integration
results. It has not independently verified upstream ledger/recovery, reservation
atomicity or cross-chain profiles. No six-service stack is required for its demo.

Numbers above describe bounded synthetic tests, not error rates or AI advantage.
Local test success is not CI, release download, external audit or independent use.
