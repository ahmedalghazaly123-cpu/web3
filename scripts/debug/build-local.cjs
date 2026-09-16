// Local production build in background (survives the short shell timeout).
// usage: node scripts/debug/build-local.cjs [logName]
// The parent run-bg.cjs already redirects stdout/stderr to the log file.
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
try {
  execSync('npm run build', { cwd: root, shell: true, stdio: 'inherit' });
  console.log('BUILD-LOCAL-DONE');
} catch (e) {
  console.log('BUILD-LOCAL-FAILED', e.message);
  process.exit(1);
}
