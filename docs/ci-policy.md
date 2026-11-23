# Hosted CI disabled — 2026-11-23

Current owner policy forbids all new CI/GitHub Actions/hosted CI runs, including
automatic runs caused by source publication. Use local validation only:

```sh
npm ci --ignore-scripts
npm test
node src/cli.mjs --witness artifacts/public-witness.json
node src/cli.mjs --replay artifacts/public-witness.json
node examples/consume-receipt.mjs
```

The previous workflow is preserved byte-for-byte as
`disabled-workflows/ci.yml.disabled`, outside GitHub's runnable workflow directory.
Its original source and earlier run evidence remain in Git history. Do not copy
it back or manually run a historical workflow. No existing run/report was deleted.

All linked prior CI runs are historical results for their named commits. The
workflow-removal commit is deliberately marked `[skip ci]` and `skip-checks: true`;
the only previous triggers were `push` and `pull_request`, which support these
skip instructions. See the [official GitHub skip documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).
The runnable definition is removed atomically in that same commit, preventing
subsequent default-branch source updates from finding a workflow to execute.

Before any future publication, inspect the target commit/ref for runnable CI
definitions and verify prevention. A new branch from historical commits can
contain the old workflow; its publication is not permitted without prevention.
If prevention cannot be assured, keep changes local. No new CI or release
verification is claimed for this policy change.
