// helper: print a line range of a file (avoids win cmd quoting issues)
// usage: node scripts/debug/print-lines.cjs <file> <startLine> <endLine>
const fs = require('fs');
const [file, start, end] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/debug/print-lines.cjs <file> <startLine> <endLine>');
  process.exit(1);
}
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const from = Math.max(1, Number(start) || 1);
const to = Math.min(lines.length, Number(end) || lines.length);
for (let i = from; i <= to; i++) console.log(String(i).padStart(4) + ' | ' + lines[i - 1]);