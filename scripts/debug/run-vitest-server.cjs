// Spawn the server vitest suite detached (tool timeout safe).
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const cwd = path.resolve(__dirname, '..', '..', 'server');
const bin = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs');
const fd = fs.openSync(path.resolve(__dirname, '..', '..', 'vitest-server.log'), 'w');
const child = spawn(process.execPath, [bin, 'run', '--reporter=dot'], { cwd, detached: true, stdio: ['ignore', fd, fd] });
child.unref();
console.log(`server vitest started pid=${child.pid}`);
