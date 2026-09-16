// Run an npm script detached (npm must be spawned as a shell command on Windows).
// usage: node scripts/debug/run-npm.cjs <logName> <npm-args...>
// e.g.: node scripts/debug/run-npm.cjs build-local.log run build
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const logName = process.argv[2] || 'npm-run.log';
const logPath = path.join(__dirname, logName);
const args = process.argv.slice(3);
if (!args.length) {
  console.error('usage: node scripts/debug/run-npm.cjs <logName> <npm-args...>');
  process.exit(1);
}

const fd = fs.openSync(logPath, 'w');
const child = spawn('npm.cmd', args, {
  cwd: root,
  detached: true,
  windowsHide: true,
  stdio: ['ignore', fd, fd],
});
child.unref();
fs.appendFileSync(logPath, `[pid=${child.pid}] npm ${args.join(' ')}\n`);
console.log(`running in background: npm ${args.join(' ')}\nlog: ${logPath}`);
