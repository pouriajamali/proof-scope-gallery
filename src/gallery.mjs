import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { exportJWK, importJWK } from 'jose';
import { isDeepStrictEqual } from 'node:util';
import { verifyReceipt, PROFILE } from './profile.mjs';
import { fixtureSigner, credentialFixture, expectedFixture, tamperPayload, NOW, ISSUER, KID, bytes } from './fixtures.mjs';

export const summarize = r => ({ signature: r.signature.status, credential: r.credential.status,
  binding: r.binding.status, scope: r.scope.status, accepted: r.accepted });

export async function buildWitness() {
  const signer = await fixtureSigner();
  const publicKeyJwk = await exportJWK(signer.publicKey);
  const expectedRows = JSON.parse(await readFile(new URL('../fixtures/expected.json', import.meta.url), 'utf8'));
  const base = credentialFixture();
  const valid = await signer.sign(base);
  const cases = [];
  for (const row of expectedRows) {
    let token = valid;
    let claim = 'request-binding';
    let outputBase64;
    if (row.id === 'tampered-output') token = tamperPayload(valid);
    if (row.id === 'wrong-request') {
      const c = credentialFixture(); c.credentialSubject.id = c.credentialSubject.serviceReceipt.requestId = 'urn:task:B';
      token = await signer.sign(c);
    }
    if (row.id === 'wrong-model') {
      const c = credentialFixture(); c.credentialSubject.serviceReceipt.model.version = '2.0.0'; token = await signer.sign(c);
    }
    if (row.id === 'unsupported-quality') claim = 'quality';
    if (row.id === 'unsupported-execution') claim = 'correct-execution';
    if (row.id.startsWith('output-bytes-')) {
      claim = 'output-binding'; outputBase64 = Buffer.from(bytes(row.id.endsWith('match') ? 'HELLO' : 'WRONG')).toString('base64');
    }
    const { id, ...expectedOutcome } = row;
    cases.push({ id, token, expected: expectedFixture(base), claim, outputBase64, expectedOutcome });
  }
  return { profile: PROFILE, provenance: 'New synthetic fixtures; ephemeral demo issuer, not an external trusted identity',
    evaluationTime: NOW, issuer: ISSUER, kid: KID, publicKeyJwk, cases };
}

export async function replayWitness(witness) {
  if (witness.profile !== PROFILE || witness.publicKeyJwk?.d || !Array.isArray(witness.cases) || witness.cases.length > 100) {
    throw new Error('Unsupported or invalid public witness');
  }
  const key = await importJWK(witness.publicKeyJwk, 'EdDSA');
  const started = performance.now();
  const results = [];
  for (const scenario of witness.cases) {
    const result = await verifyReceipt({ token: scenario.token, expected: scenario.expected,
      claim: scenario.claim, now: witness.evaluationTime,
      outputBytes: scenario.outputBase64 === undefined ? undefined : Buffer.from(scenario.outputBase64, 'base64'),
      trustedKeys: [{ kid: witness.kid, issuer: witness.issuer, publicKey: key }] });
    results.push({ ...scenario, result, matchesExpected: isDeepStrictEqual(summarize(result), scenario.expectedOutcome) });
  }
  return { profile: PROFILE, evaluationTime: witness.evaluationTime,
    provenance: witness.provenance, elapsedMs: performance.now() - started,
    passed: results.filter(r => r.matchesExpected).length, total: results.length, results };
}

export const escapeHtml = x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function renderHtml(report) {
  const e = escapeHtml;
  const status = x => `<span class="status ${x === 'PASS' || x === 'SUPPORTED' ? 'pass' : 'other'}">${e(x)}</span>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proof Scope Gallery</title><style>
body{margin:0;background:#0b1723;color:#e6edf3;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:40px 24px}
h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.1;max-width:850px}p{max-width:80ch;color:#bdcddd}a{color:#82d5ee}
.eyebrow{color:#82d5ee;font-weight:700;letter-spacing:.1em}.notice{border-left:4px solid #e6ad63;padding:12px 20px;background:#162535}
table{border-collapse:collapse;min-width:750px;width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid #304254}th{color:#a9c2d8}
.scroll{overflow:auto}.status{font-size:.8rem;font-weight:700}.pass{color:#83dbb0}.other{color:#f1bc7b}article{border:1px solid #304254;border-radius:12px;padding:18px;margin:20px 0}
pre{overflow:auto;max-height:420px;background:#08111a;padding:14px;font-size:.8rem}summary{cursor:pointer;color:#82d5ee}code{overflow-wrap:anywhere}
</style><main><div class="eyebrow">PROOF SCOPE GALLERY · ONE VC PROFILE</div>
<h1>A valid signature can support the wrong request.</h1>
<p>The same runner checks real Ed25519 signatures with jose, then checks public request binding and the requested claim. Each column answers a different question.</p>
<div class="notice"><strong>A signature is an issuer statement.</strong> No computation proof, model quality, data rights, TEE/GPU or payment settlement is established by this profile. Green cells do not imply those claims.</div>
<p>${e(report.passed)}/${e(report.total)} scenarios matched fixed expected outcomes. Local verification: ${e(report.elapsedMs.toFixed(2))} ms; CPU only. Fixed fixture evaluation time: ${e(report.evaluationTime)}. This is not a performance benchmark or a current credential-validity check.</p>
<div class="scroll"><table><thead><tr><th>Scenario</th><th>Signature</th><th>Credential</th><th>Binding</th><th>Claim scope</th><th>Accepted</th></tr></thead><tbody>
${report.results.map(c => `<tr><td><a href="#${e(c.id)}">${e(c.id)}</a></td><td>${status(c.result.signature.status)}</td><td>${status(c.result.credential.status)}</td><td>${status(c.result.binding.status)}</td><td>${status(c.result.scope.status)}</td><td>${e(c.result.accepted)}</td></tr>`).join('')}
</tbody></table></div>
${report.results.map(c => `<article id="${e(c.id)}"><h2>${e(c.id)}</h2><p>Requested claim: <code>${e(c.claim)}</code>. Expected/actual matched: <strong>${e(c.matchesExpected)}</strong>.</p>
<ul>${['signature', 'credential', 'binding', 'scope'].map(k => `<li><strong>${e(k)}</strong>: ${e(c.result[k].reason)}</li>`).join('')}</ul>
<details><summary>Inspect public witness, expected context and verifier output</summary><pre>${e(JSON.stringify(c, null, 2))}</pre></details></article>`).join('')}
<p>Witness origin: ${e(report.provenance)}. Raw private input and signing private keys are absent. Replay uses a public JWK and signed token; a witness-supplied demo key is not independently trusted identity.</p>
<p>Sources: <a href="https://github.com/panva/jose">jose verifier</a> · <a href="https://www.w3.org/TR/2025/REC-vc-jose-cose-20250515/">W3C VC securing mechanism</a></p></main></html>`;
}
