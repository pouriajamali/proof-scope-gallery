import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { guardExplanation, scorePredictions } from '../src/explanation-guard.mjs';

test('an explanation cannot promote unsupported quality or alter the verifier decision', () => {
  const original = { accepted: false, scope: { status: 'UNSUPPORTED', reason: 'quality' } };
  const result = guardExplanation(original, { label: 'SUPPORTED', text: 'The signature guarantees quality', sources: ['signature'] });
  assert.equal(result.accepted, false);
  assert.equal(result.scope.status, 'UNSUPPORTED');
  assert.equal(result.explanationAccepted, false);
  const valid = guardExplanation(original, { label: 'UNSUPPORTED', text: 'Quality is outside the profile', sources: ['limits'] });
  assert.equal(valid.explanationAccepted, true);
  assert.equal(valid.accepted, false);
  assert.equal(guardExplanation(original, { label: 'UNSUPPORTED', text: 'claim', sources: ['invented-reference'] }).explanationAccepted, false);
});

test('scoring detects hallucinated support, attribution mistakes and incomplete runs without inventing model data', async () => {
  const corpus = JSON.parse(await readFile(new URL('../fixtures/claim-evaluation.json', import.meta.url), 'utf8'));
  const predictions = corpus.cases.map(c => ({ id: c.id, label: c.expected, sources: [c.source] }));
  predictions.find(p => p.id === 'c05').label = 'SUPPORTED';
  predictions.find(p => p.id === 'c06').sources = ['invented-reference'];
  const metadata = { kind: 'harness-test-only', method: 'deliberately altered oracle-shaped test input; not a model', cost: 0, costUnit: 'no-inference' };
  const score = scorePredictions(corpus, predictions, metadata);
  assert.equal(score.correct, 11);
  assert.equal(score.unsupportedFalsePositive, 1);
  assert.equal(score.attributionFailures, 1);
  assert.equal(score.empiricalModelRun, false);
  assert.throws(() => scorePredictions(corpus, predictions.slice(1), metadata));
});
