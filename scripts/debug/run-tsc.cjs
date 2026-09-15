/**
 * Run the TypeScript check detached so it survives the tool's 30s command
 * timeout, and write the output to a log file that can be polled.
 *
 *   node scripts/debug/run-tsc.cjs server   -> server/: npx tsc --noEmit
 *   node scripts/debug/run-tsc.cjs front    -> repo root: npx tsc -b
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const target = process.argv[2] === 'front' ? 'front' : 'server';
const root = path.resolve(__dirname, '..', '..');
const cwd = target === 'server' ? path.join(root, 'server') : root;
const args = target === 'server' ? ['--noEmit'] : ['-b'];
const logPath = path.join(root, target === 'server' ? 'tsc-server.log' : 'tsc-front.log');

const fd = fs.openSync(logPath, 'w');
// Spawn the TypeScript compiler with the current Node binary: spawning
// `npx.cmd` directly throws EINVAL on Windows.
const tscBin = path.join(cwd, 'node_modules', 'typescript', 'bin', 'tsc');
const child = spawn(process.execPath, [tscBin, ...args], { cwd, detached: true, stdio: ['ignore', fd, fd] });
child.unref();
console.log(`tsc (${target}) started -> ${logPath}`);
