# Project execution policy

The owner's instruction of 2026-11-23 forbids new CI/GitHub Actions/hosted CI
execution for this project. Local tests and builds are allowed within the
existing resource and source restrictions.

Do not dispatch/rerun workflows or trigger CI through pushes, pull requests,
merges, schedules, releases or external CI. Do not restore workflow definitions
under `.github/workflows` or re-enable automated CI without a later direct owner
instruction. The old workflow is preserved as inert documentation under
`docs/disabled-workflows/ci.yml.disabled`; it must remain inert.

Before any future publication, inspect the actual target commit/ref and remote
workflow state to ensure it cannot trigger CI. If that cannot be assured, retain
the change locally. Historical CI links are dated evidence, not current validation
or permission to run CI. Never label local validation as hosted CI.

All existing scope, trust and evidence limits still apply. Preserve historical
phase reports. Coordination updates belong in G6's own local directory; exactly
one consolidated manager notice is allowed at the end of each phase. No duplicate,
correction or acknowledgment notices for already-reported phases, and no messages
to the company mother or other project chats. Applying this policy is not a phase.
