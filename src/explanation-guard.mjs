/** Model text is untrusted presentation; it cannot mutate verifier decisions. */
export function guardExplanation(verifierResult, suggestion) {
  const expectedLabel = verifierResult.scope.status;
  const valid = suggestion && suggestion.label === expectedLabel
    && ['SUPPORTED', 'UNSUPPORTED'].includes(suggestion.label)
    && typeof suggestion.text === 'string' && suggestion.text.length > 0 && suggestion.text.length <= 4000
    && Array.isArray(suggestion.sources) && suggestion.sources.length > 0
    && suggestion.sources.every(s => ['signature', 'binding', 'limits'].includes(s));
  return { accepted: verifierResult.accepted, scope: structuredClone(verifierResult.scope),
    explanationAccepted: Boolean(valid), explanation: valid ? suggestion.text : 'Explanation rejected; use the deterministic verifier reasons.',
    modelTextIsUntrusted: true };
}

/** Score externally produced predictions; this function never runs or impersonates a model. */
export function scorePredictions(corpus, predictions, metadata) {
  if (corpus.schema !== 'g6-claim-evaluation/0.1.0' || !Array.isArray(predictions)
    || !metadata || !['model', 'template', 'harness-test-only'].includes(metadata.kind)
    || typeof metadata.method !== 'string' || typeof metadata.costUnit !== 'string'
    || !Number.isFinite(metadata.cost) || metadata.cost < 0) throw new Error('Invalid evaluation input or method/cost metadata');
  const expectedIds = corpus.cases.map(c => c.id);
  if (predictions.length !== expectedIds.length || new Set(predictions.map(p => p.id)).size !== expectedIds.length
    || predictions.some(p => !expectedIds.includes(p.id))) throw new Error('Predictions must cover each frozen case exactly once');
  let correct = 0, unsupportedFalsePositive = 0, attributionFailures = 0, invalidLabels = 0;
  for (const c of corpus.cases) {
    const p = predictions.find(p => p.id === c.id);
    if (p.label === c.expected) correct++;
    if (!['SUPPORTED', 'UNSUPPORTED'].includes(p.label)) invalidLabels++;
    if (c.expected === 'UNSUPPORTED' && p.label === 'SUPPORTED') unsupportedFalsePositive++;
    if (!Array.isArray(p.sources) || !p.sources.includes(c.source)
      || p.sources.some(s => !Object.hasOwn(corpus.sources, s))) attributionFailures++;
  }
  return { schema: 'g6-classification-score/0.1.0', corpusRevision: corpus.corpusRevision,
    method: structuredClone(metadata), total: corpus.cases.length, correct, unsupportedFalsePositive,
    attributionFailures, invalidLabels,
    empiricalModelRun: metadata.kind === 'model',
    limitation: 'Author-labelled bounded corpus; not independent evidence of general model ability or security.' };
}
