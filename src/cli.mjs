import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildWitness, replayWitness, renderHtml, summarize } from './gallery.mjs';

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--html', '--json', '--witness', '--replay'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: node src/cli.mjs [--html file] [--json file] [--witness file] [--replay public-witness.json]');
    options[args[i]] = args[i + 1];
  }
  const witness = options['--replay'] ? JSON.parse(await readFile(options['--replay'], 'utf8')) : await buildWitness();
  const report = await replayWitness(witness);
  for (const row of report.results) console.log(JSON.stringify({ id: row.id, ...summarize(row.result), matchesExpected: row.matchesExpected }));
  console.log(`${report.passed}/${report.total} expected outcomes matched; verification ${report.elapsedMs.toFixed(2)} ms; fixed fixture time ${report.evaluationTime}`);
  for (const [flag, value] of [['--html', renderHtml(report)], ['--json', JSON.stringify(report, null, 2)], ['--witness', JSON.stringify(witness, null, 2)]]) {
    if (options[flag]) { await mkdir(dirname(options[flag]), { recursive: true }); await writeFile(options[flag], value); }
  }
  if (report.passed !== report.total) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
