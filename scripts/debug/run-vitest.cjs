/**
 * Run a Vitest suite detached (the tool kills commands after 30s) and stream the
 * output to a log file so it can be polled.
 *
 *   node scripts/debug/run-vitest.cjs         -> repo root: frontend suite
 *   node scripts/debug/run-vitest.cjs server  -> server/: backend suite
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const target = process.argv[2] === 'server' ? 'server' : 'front';
const root = path.resolve(__dirname, '..', '..');
const cwd = target === 'server' ? path.join(root, 'server') : root;
const logPath = path.join(root, target === 'server' ? 'vitest-server.log' : 'vitest-front.log');
const bin = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs');

const fd = fs.openSync(logPath, 'w');
const child = spawn(process.execPath, [bin, 'run', '--reporter=dot'], {
  cwd,
  detached: true,
  stdio: ['ignore', fd, fd],
});
child.unref();
console.log(`vitest (${target}) started -> ${logPath}`);
