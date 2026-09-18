const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync('docker', ['compose', 'up', '-d', '--build', 'server', 'client'], {
  cwd: path.resolve(__dirname, '../..'), stdio: 'inherit', timeout: 600000, windowsHide: true,
});
if (result.error) console.error(result.error.message);
console.log(`DEPLOY_EXIT=${result.status}`);
process.exit(result.status ?? 1);
