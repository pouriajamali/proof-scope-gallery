import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWitness, replayWitness, renderHtml, escapeHtml, summarize } from '../src/gallery.mjs';

test('all gallery cases agree with fixed expected outcomes after public-only replay', async () => {
  const witness = await buildWitness();
  assert.equal(Object.hasOwn(witness.publicKeyJwk, 'd'), false);
  const first = await replayWitness(witness);
  const second = await replayWitness(JSON.parse(JSON.stringify(witness)));
  assert.equal(first.total, 8);
  assert.equal(first.passed, 8);
  assert.deepEqual(first.results.map(r => summarize(r.result)), second.results.map(r => summarize(r.result)));
  const html = renderHtml(first);
  assert.match(html, /wrong-request/);
  assert.match(html, /No computation proof/);
  assert.match(html, /Inspect public witness/);
});

test('witness text is escaped in offline HTML', async () => {
  assert.equal(escapeHtml('<script>"&\''), '&lt;script&gt;&quot;&amp;&#39;');
  const report = await replayWitness(await buildWitness());
  report.provenance = '<script>alert(1)</script>';
  const html = renderHtml(report);
  assert.equal(html.includes('<script>'), false);
  assert.match(html, /&lt;script&gt;/);
});
