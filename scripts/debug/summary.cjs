/**
 * Prints the matching lines of a log file with ANSI colours stripped, so vitest
 * summaries are readable inside the short shell timeout.
 *
 *   node scripts/debug/summary.cjs <logFile> [regex] [maxLines]
 */
const fs = require('node:fs');
const path = require('node:path');

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/debug/summary.cjs <logFile> [regex] [maxLines]');
  process.exit(1);
}
const pattern = new RegExp(process.argv[3] || 'Test Files|Tests |FAIL|Error', 'i');
const maxLines = Number(process.argv[4] || 40);

const raw = fs.readFileSync(path.resolve(__dirname, '..', '..', file), 'utf8');
const plain = raw.replace(/\u001b\[[0-9;]*m/g, '');
const lines = plain.split(/\r?\n/).filter((l) => pattern.test(l));
console.log(lines.slice(0, maxLines).join('\n'));
console.log(`\n[matched ${lines.length} of ${plain.split(/\r?\n/).length} lines]`);