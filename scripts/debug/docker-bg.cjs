// helper: run a long docker command detached with output redirected to a log,
// so it survives beyond the caller's timeout window.
// usage: node scripts/debug/docker-bg.cjs compose build server
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node scripts/debug/docker-bg.cjs <docker args...>');
  process.exit(1);
}
const label = args.join('-').replace(/[^a-z0-9-]/gi, '_');
const logFile = path.join(__dirname, 'docker-' + label + '.log');
const out = fs.openSync(logFile, 'w');
fs.writeSync(out, 'CMD: docker ' + args.join(' ') + '\n---\n');

const child = spawn('docker', args, {
  cwd: rootDir,
  detached: true,
  windowsHide: true,
  stdio: ['ignore', out, out],
});
child.unref();
fs.appendFileSync(logFile, '[spawned pid=' + child.pid + ']\n');
console.log('running in background: docker ' + args.join(' '));
console.log('log: ' + logFile);