# G6 consumer boundaries 0.1.0

These adapters use public ESM imports from `src/adapters.mjs`; no live service,
wallet, database or G2/G3 process is required. Run:

```sh
node examples/consume-receipt.mjs
```

`assessService` accepts `verificationInput` (the profile verifier arguments),
`response` (`state` and actual `outputBytes`), `paymentObservation`, and `grant`.
It returns payment, service, authorization and unsupported quality/execution
axes separately. `serviceAuthorizedAndBound` means only that supplied output
bytes bind to the receipt under the supplied offline intent policy; it does not
require or prove payment. Failed or missing results remain visible even when
the separate payment observation says reported-settled.

`g6-payment-observation/0.1.0` contains requestId, asset, unit, exact integer-string
amount, state (`reported-settled`, `reported-failed`, `unknown`) and original native
observation fields. A matching payment remains **reported**, not independently
verified settlement. Raw native evidence is retained.

`g6-authorized-intent/0.1.0` is a supplied local authorization statement with
decision, the complete `expected` receipt binding context, asset/unit, spentAtomic,
openReservedAtomic, totalCapAtomic and perRequestCapAtomic. The open reservations
exclude the candidate request: test `spent + open reservations + candidate charge`
against the total cap using BigInt. This is an offline preflight example. It
authenticates no policy issuer, performs no reservation and supplies no atomic,
concurrent or crash-safe enforcement. Production authorization belongs to the
consumer's enforcement boundary; G3 and CMP-02 remain separate owners.

The synthetic service uppercases UTF-8 text. Its code file is SHA-256-bound in the
receipt; this records a declared code identity, not evidence that code ran. No
model inference/GPU/chain is performed and private input is not in the receipt.

## Upstream compatibility audit

Inspected G2 `docs/contract-v1.md` blob
`bfed0d3bb2b07c18c8b59dea5c36854e4155d5bf` at project commit
`6cba2ce35c2b496113684ff39603313923bb39aa`:
`traceVersion: 1.0`, `lifi-status-observation-v1`. Its service observation supports
`synthetic-declaration` only. `g2TraceBoundary` deliberately retains our distinct
verification type and reports **unsupported-verification-type**. No current G2
wire compatibility or owner-approved shared schema is claimed. Do not silently
relabel a cryptographic receipt as its synthetic declaration. A future integration
needs owner-coordinated versioning, migration example and both-side contract tests.

CMP-03 consumption is similarly explicit: `retainConformanceObservation` preserves
the native payload/config/version without treating a message verification result
as action execution or delivered assets. It is not an implementation of CCTP,
CCIP, IBC, LayerZero, Wormhole or Hyperlane.

G6 owns CMP-06 and its service receipt schema. G2 owns CMP-02/03. These G6-owned
fixture boundaries do not redefine those upstream contracts or certify their
phase completion. Independent adoption by G2/G3 remains a later integration gate.
