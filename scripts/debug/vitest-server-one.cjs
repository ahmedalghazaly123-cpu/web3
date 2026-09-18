// Runs a *specific* Vitest suite inside server/ detached, with its own log.
// usage: node scripts/debug/vitest-server-one.cjs tests/google-oauth.test.ts
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const serverDir = path.join(root, 'server');
const logPath = path.join(__dirname, 'vitest-server-one.log');
const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node scripts/debug/vitest-server-one.cjs <test-file...>');
  process.exit(1);
}
const bin = path.join(serverDir, 'node_modules', 'vitest', 'vitest.mjs');
const fd = fs.openSync(logPath, 'w');
const child = spawn(process.execPath, [bin, 'run', ...args, '--reporter=dot'], {
  cwd: serverDir,
  detached: true,
  windowsHide: true,
  stdio: ['ignore', fd, fd],
});
child.unref();
console.log(`vitest(server) ${args.join(' ')} -> ${logPath}`);