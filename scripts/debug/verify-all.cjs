/**
 * Sequential full verification.
 *
 * Everything runs ONE AT A TIME on purpose: this machine is memory-bound, and
 * running Vitest and Playwright simultaneously kills Playwright workers
 * (`worker process exited unexpectedly, code=3221225786`) even when the code is
 * fine. That is a resource problem, not a product problem.
 *
 *   node scripts/debug/verify-all.cjs
 *
 * Output: scripts/debug/verify-all.log (poll it with print-lines.cjs / grep.cjs)
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const serverDir = path.join(root, 'server');
const logPath = path.join(__dirname, 'verify-all.log');
const log = fs.openSync(logPath, 'w');

function section(title) {
  fs.writeSync(log, `\n\n========== ${title} ==========\n`);
}

function run(title, cwd, args) {
  section(title);
  fs.writeSync(log, `$ ${args.join(' ')}   (cwd=${path.relative(root, cwd) || '.'})\n`);
  const started = Date.now();
  const res = spawnSync(args[0], args.slice(1), {
    cwd,
    windowsHide: true,
    stdio: ['ignore', log, log],
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const status = res.status === 0 ? 'PASS' : `FAIL(${res.status}${res.signal ? '/' + res.signal : ''})`;
  fs.writeSync(log, `----- ${title}: ${status} in ${secs}s -----\n`);
  return res.status === 0;
}

const node = process.execPath;
const results = [];

// 1. type checks
results.push(['tsc server', run('TSC server', serverDir, [node, path.join(serverDir, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit'])]);
results.push(['tsc front', run('TSC front', root, [node, path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-b'])]);

// 2. unit tests
results.push(['vitest front', run('vitest front', root, [node, path.join(root, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=dot'])]);
results.push(['vitest server', run('vitest server', serverDir, [node, path.join(serverDir, 'node_modules', 'vitest', 'vitest.mjs'), 'run', '--reporter=dot'])]);

// 3. live API + deployment checks
results.push(['live-check', run('live-check (API)', root, [node, path.join(__dirname, 'live-check.cjs')])]);
results.push(['deploy-check', run('deploy-check', root, [node, path.join(__dirname, 'deploy-check.cjs')])]);

// 4. browser E2E — single worker, nothing else running
results.push(['e2e', run('E2E (playwright, 1 worker)', root,
  [node, path.join(root, 'node_modules', '@playwright', 'test', 'cli.js'), 'test', 'tests/e2e', '--reporter=line', '--workers=1'])]);

section('SUMMARY');
for (const [name, ok] of results) fs.writeSync(log, `${ok ? 'PASS' : 'FAIL'}  ${name}\n`);
const failed = results.filter(([, ok]) => !ok).length;
fs.writeSync(log, `\n${results.length - failed}/${results.length} sections passed\n`);
fs.closeSync(log);
console.log(`done -> ${logPath}`);
console.log(results.map(([n, ok]) => `${ok ? 'PASS' : 'FAIL'}  ${n}`).join('\n'));