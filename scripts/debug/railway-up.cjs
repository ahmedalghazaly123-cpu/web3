// Upload + deploy the current working tree to a Railway service, detached, with
// the CLI output in a log file — `railway up` indexes and uploads the archive,
// which outlives this shell's short command timeout.
//
// usage:
//   node scripts/debug/railway-up.cjs --service frontend
//   node scripts/debug/railway-up.cjs --service backend --path server
//   (--path is always uploaded with --path-as-root, i.e. that folder becomes the
//    build context root — required for the backend service, whose Dockerfile
//    lives in server/ and expects server/ as the context.)
// log: scripts/debug/railway-up-<service>.log
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const readFlag = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const service = readFlag('--service', '');
const dir = readFlag('--path', '.');
if (!service) {
  console.error('usage: node scripts/debug/railway-up.cjs --service <name> [--path <dir>]');
  process.exit(2);
}

// `railway` on Windows is a Node shim; the npm package ships a real railway.exe.
function railwayBin() {
  if (process.env.RAILWAY_BIN) return process.env.RAILWAY_BIN;
  if (process.platform === 'win32') {
    const exe = path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@railway', 'cli', 'bin', 'railway.exe');
    if (fs.existsSync(exe)) return exe;
  }
  return 'railway';
}

const root = path.resolve(__dirname, '..', '..');
const logPath = path.join(__dirname, `railway-up-${service}.log`);
const fd = fs.openSync(logPath, 'w');
const args = ['up', dir, '--path-as-root', '--service', service, '--detach'];

fs.appendFileSync(logPath, `CMD: railway ${args.join(' ')}\nCWD: ${root}\n---\n`);
const child = spawn(railwayBin(), args, {
  cwd: root,
  detached: true,
  windowsHide: true,
  stdio: ['ignore', fd, fd],
});
child.unref();
console.log(`uploading "${dir}" to service "${service}" in the background\nlog: ${logPath}`);