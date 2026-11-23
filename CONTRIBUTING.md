# Contributing

Start with one reproducible wrong-binding or unsupported-claim example for the
existing profile. Include public synthetic input, an explicit expected outcome
for each layer, actual CLI output, Node version and the exact source commit.
Never include real signing private keys, private model input, employer data or
unlicensed datasets. Test locally with `npm ci --ignore-scripts`, `npm test`, the
gallery witness replay and the standalone consumer example. Hosted CI is
disabled by current owner policy; do not trigger it through publication or reruns.

A profile change needs its trust assumptions, negative cases, independent expected
outcomes, pinned verifier dependency and migration examples. New cryptography,
compute marketplaces or a second proof profile are not default contributions.
The second-profile gate requires observed independent consumption of this one.

Report a boundary or explanation error as precisely as a success. An authentic
signature is not a model quality or execution guarantee. Text proposed by a model
must not alter verifier decisions. A failing test with a small reproducible
public witness is more useful than an unsupported assurance claim.

Maintenance: inspect upstream jose security/release notes before upgrades; pin
the reviewed version/integrity; run all affected profile, replay and consumer
local tests and inspect CI prevention before any publication. Historical CI is
not permission to start a new run. Do not report a dependency bump as a performance or
security improvement without corresponding evidence. Consumer adoption and
maintenance effort are unknown until measured; this repository provides no SLA.
