# P4 empirical comparison: DEFERRED

The deterministic verifier remains the authority. A model may explain or classify
the evidence, and `guardExplanation` cannot change the original accepted/scope
result. Even a correctly labelled explanation is untrusted text; this guard does
not prove its prose is truthful. Display it as attributed model text and escape it.

No model has been run for this evaluation. No empirical model accuracy, token
cost, hallucination rate or advantage is reported. Local `ollama` and
`llama-server` executables were absent at the execution check. No inference
endpoint/model or paid inference budget is configured for this project. The
authoring assistant is not silently substituted for a logged benchmark model.
This blocks only empirical P4, not independent P5 hardening.

Before resumption, pin a usable model/runtime and prompt, record cost/time units
and budget, freeze the corpus hash before any model output, and specify the same
source excerpt/choices for the model and fixed template comparator. Keep prompt
selection examples separate from the frozen evaluation cases. The existing
12 questions are an original author-labelled bounded corpus, not a representative
or independently held-out dataset. Expand/replace them before any general claim.

`scorePredictions` requires one labelled prediction per case, method metadata and
explicit cost; it counts unsupported claims promoted to supported, invalid labels
and missing/invented attribution. Harness tests inject known errors to test the
scorer and are labelled `harness-test-only`, never model evaluation. A negative
result or no measurable benefit is an acceptable P4 outcome. No automatic model
downloads, paid API calls, hidden chain-of-thought collection or model-setting
changes are required by this protocol.

Go gate: actual reproducible model and fixed-comparator outputs under a pinned
budget/source context, frozen labels and recorded attribution/cost. Until then,
G6/CMP-06 P4 remains DEFERRED, not VERIFIED.
