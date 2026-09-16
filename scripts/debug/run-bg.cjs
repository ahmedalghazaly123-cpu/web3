/**
 * Run any local script detached with its output in a log file, so a long run
 * (AI provider cascade, Playwright suite, docker build) survives the shell's
 * short command timeout and can be polled afterwards.
 *
 *   node scripts/debug/run-bg.cjs scripts/debug/ai-live-check.cjs [logName] [extraArgs...]
 *
 * Note: when passing extra arguments you must also pass the log name (pass `-`
 * to fall back to the default naming).
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/debug/run-bg.cjs <script> [logName]');
  process.exit(1);
}
const script = path.resolve(root, target);
const logName = process.argv[3] && process.argv[3] !== '-'
  ? process.argv[3]
  : path.basename(target).replace(/\.(cjs|mjs|js|ts)$/, '') + '.log';
const logPath = path.join(__dirname, logName);

const fd = fs.openSync(logPath, 'w');
const child = spawn(process.execPath, [script, ...process.argv.slice(4)], {
  cwd: root,
  detached: true,
  windowsHide: true,
  stdio: ['ignore', fd, fd],
});
child.unref();
fs.appendFileSync(logPath, `[pid=${child.pid}] node ${target}\n`);
console.log(`running in background: node ${target}\nlog: ${logPath}`);