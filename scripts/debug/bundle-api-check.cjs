// Prove the compose file bakes a same-origin API base into a fresh Vite
// build: run `npm run build` with VITE_API_URL=/api/v1 and scan dist/.
// usage: node scripts/debug/bundle-api-check.cjs
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function sh(cmd, args, opts = {}) {
  // execFileSync('npm.cmd') throws EINVAL on Windows; run through the shell instead.
  const quoted = [cmd, ...args].map((a) => (a.includes(' ') ? '"' + a + '"' : a)).join(' ');
  return execSync(quoted, { cwd: ROOT, timeout: 420000, windowsHide: true, shell: 'cmd.exe', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts }).trim();
}

try {
  console.log('building with VITE_API_URL=/api/v1 ...');
  sh('npm', ['run', 'build'], { env: { ...process.env, VITE_API_URL: '/api/v1' }, timeout: 420000 });
  console.log(sh('node', ['scripts/debug/bundle-scan.cjs', 'dist']));
  console.log('PASS fresh build with VITE_API_URL=/api/v1 has no absolute refs');
} catch (e) {
  console.log('FAIL', e.message);
  process.exit(1);
}

try {
  console.log('building with VITE_API_URL=/api/v1 ...');
  sh('npm', ['run', 'build'], { env: { ...process.env, VITE_API_URL: '/api/v1' }, timeout: 420000 });
  console.log(sh('node', ['scripts/debug/bundle-scan.cjs', 'dist']));
  console.log('PASS fresh build with VITE_API_URL=/api/v1 has no absolute refs');
} catch (e) {
  console.log('FAIL', e.message);
  process.exit(1);
}