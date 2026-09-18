// Show a numbered slice of a file: node show-lines.cjs <file> <start> <end>
const fs = require('fs');
const [file, start, end] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const a = Math.max(1, Number(start) || 1);
const b = Math.min(lines.length, Number(end) || lines.length);
for (let i = a; i <= b; i++) console.log(`${i}| ${lines[i - 1]}`);
