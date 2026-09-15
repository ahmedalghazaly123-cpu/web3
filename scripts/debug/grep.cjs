// helper: grep a file/log by regex (avoids cmd.exe quoting hell with findstr).
// usage: node scripts/debug/grep.cjs <file> <regex> [--i]
const fs = require('fs');
const [file, rawPattern, flag] = process.argv.slice(2);
if (!file || !rawPattern) {
  console.error('usage: node scripts/debug/grep.cjs <file> <regex> [--i]');
  process.exit(1);
}
// cmd.exe may hand the pattern over with its quotes still attached — strip them.
const pattern = rawPattern.replace(/^"(.*)"$/, '$1');
const text = fs.readFileSync(file, 'utf8');
const re = new RegExp(pattern, flag === '--i' ? 'i' : undefined);
const hits = text.split(/\r?\n/).filter((l) => re.test(l));
hits.forEach((l) => console.log(l));
console.log(`[${hits.length} match(es) in ${file}]`);
if (!hits.length) process.exit(1);