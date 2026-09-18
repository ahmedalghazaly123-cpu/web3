// Print a line range of a source file (1-based, inclusive).
const fs = require('node:fs');
const [file, from, to] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(lines.slice(Number(from) - 1, Number(to)).map((l, i) => `${Number(from) + i}| ${l}`).join('\n'));
