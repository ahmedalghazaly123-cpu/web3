// helper: run Playwright E2E detached with output redirected to a log.
// Playwright's own webServer block reuses an already-running frontend
// (the Docker web container on :3000), so no dev server is started here.
// usage: node scripts/debug/run-e2e.cjs [extra playwright args...]
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const logFile = path.join(root, 'playwright.log');
const extra = process.argv.slice(2);

const out = fs.openSync(logFile, 'w');
fs.writeSync(out, 'CMD: npx playwright test ' + extra.join(' ') + '\n---\n');

const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const child = spawn(process.execPath, [cli, 'test', ...extra], {
  cwd: root,
  detached: true,
  windowsHide: true,
  env: { ...process.env, PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000' },
  stdio: ['ignore', out, out],
});
child.unref();
console.log(`playwright started (pid=${child.pid})`);
console.log(`log: ${logFile}`);