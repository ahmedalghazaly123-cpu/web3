/**
 * Commit helper that avoids Windows cmd.exe quote mangling.
 *
 * `git commit -m "a b c"` invoked through cmd.exe loses the quotes and splits
 * the message into pathspecs. This script spawns git directly with an argv
 * array, so the message survives intact.
 *
 * usage: node scripts/debug/commit.cjs fix: retry ollama probe in deploy-check
 */
const { execFileSync } = require('node:child_process');

const message = process.argv.slice(2).join(' ').trim();
if (!message) {
  console.error('usage: node scripts/debug/commit.cjs <commit message>');
  process.exit(1);
}

try {
  execFileSync('git', ['commit', '-m', message], { stdio: 'inherit' });
} catch {
  process.exit(1);
}