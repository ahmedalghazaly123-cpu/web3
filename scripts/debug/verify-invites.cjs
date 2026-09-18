// Run verification with explicit exit codes, outside the shell's short timeout.
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
async function run(name, cwd, args) {
  console.log(`START ${name}`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true });
    child.on('error', (err) => { console.error(err); resolve(1); });
    child.on('exit', (code) => { console.log(`END ${name}: exit=${code}`); resolve(code ?? 1); });
  });
}
(async () => {
  const checks = [
    ['frontend-types', root, ['node_modules/typescript/bin/tsc', '-b']],
    ['server-types', path.join(root, 'server'), ['node_modules/typescript/bin/tsc', '--noEmit']],
    ['browser-invites', root, ['scripts/debug/admin-invite-ui-check.cjs']],
  ];
  const codes = await Promise.all(checks.map(([name, cwd, args]) => run(name, cwd, args)));
  process.exitCode = codes.some((code) => code !== 0) ? 1 : 0;
  console.log(`VERIFICATION COMPLETE: exit=${process.exitCode}`);
})();
