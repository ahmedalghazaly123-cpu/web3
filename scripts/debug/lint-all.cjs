/**
 * Repo-wide lint using the locally installed oxlint binary (npx resolution is
 * too slow for the shell's command timeout on this machine).
 *
 *   node scripts/debug/lint-all.cjs            # lint server/src, src, scripts
 *   node scripts/debug/lint-all.cjs <paths...> # lint specific paths
 *
 * Exit code is 0 only when there are no warnings/errors.
 */
'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const oxlint = path.join(root, 'node_modules', 'oxlint', 'bin', 'oxlint');
if (!fs.existsSync(oxlint)) {
  console.error('oxlint not installed. Run: npm install');
  process.exit(2);
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['server/src', 'src', 'scripts'];

const res = spawnSync(process.execPath, [oxlint, ...targets], { cwd: root, encoding: 'utf8' });
const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
console.log(out || '(no lint output)');
console.log(`\noxlint exit=${res.status} targets=${targets.join(', ')}`);
process.exit(res.status === 0 ? 0 : 1);