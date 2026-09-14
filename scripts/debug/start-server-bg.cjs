const { spawn } = require('child_process');
const fs = require('fs');

// load server/.env
const envText = fs.readFileSync('server/.env', 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const out = fs.openSync('scripts/debug/server-run.log', 'a');
const child = spawn('node', ['server/node_modules/tsx/dist/cli.mjs', 'server/src/index.ts'], {
  detached: true,
  stdio: ['ignore', out, out],
  env: process.env,
  cwd: process.cwd(),
});
child.unref();
console.log('spawned pid:', child.pid);
