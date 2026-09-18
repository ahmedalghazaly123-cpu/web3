const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const steps = [
  ['frontend-types', root, 'node_modules/typescript/bin/tsc', ['-b']],
  ['server-types', path.join(root, 'server'), 'node_modules/typescript/bin/tsc', ['-p', 'tsconfig.json']],
  ['frontend-bundle', root, 'node_modules/vite/bin/vite.js', ['build']],
];
for (const [name, cwd, script, args] of steps) {
  console.log(`START ${name}`);
  const result = spawnSync(process.execPath, [path.join(cwd, script), ...args], {
    cwd, stdio: 'inherit', timeout: 240000, windowsHide: true,
  });
  console.log(`END ${name}: ${result.status}`);
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(1);
}
console.log('BUILD_CHECKS_PASSED');
