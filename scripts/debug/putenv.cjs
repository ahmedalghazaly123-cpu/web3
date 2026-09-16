// helper: idempotently set KEY=VALUE in an env file (creates the file if absent,
// replaces the line if the key exists). Keeps keys ordered and comments intact.
// usage: node scripts/debug/putenv.cjs <KEY> <VALUE> [envFile]
const fs = require('fs');
const path = require('path');

const [rawKey, rawValue] = process.argv.slice(2);
if (!rawKey || rawValue === undefined) {
  console.error('usage: node scripts/debug/putenv.cjs <KEY> <VALUE> [envFile]');
  process.exit(1);
}
// cmd.exe / PowerShell keep the wrapping quotes when a value contains commas,
// so `OPENROUTER_MODEL="a,b"` would otherwise land in .env with literal quotes.
// Strip one layer of wrapping quotes so the written value is always clean.
const key = rawKey;
const value = rawValue.replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1');
const envFile = process.argv[4]
  ? path.resolve(process.argv[4])
  : path.join(__dirname, '..', '..', 'server', '.env');

const lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8').split(/\r?\n/) : [];
const idx = lines.findIndex((l) => new RegExp('^\\s*' + key + '\\s*=').test(l));
const next = `${key}=${value}`;

if (idx >= 0) {
  const before = lines[idx];
  lines[idx] = next;
  fs.writeFileSync(envFile, lines.join('\n'));
  console.log(`${key}: "${before.trim()}" -> "${next}"`);
} else {
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  lines.push(next, '');
  fs.writeFileSync(envFile, lines.join('\n'));
  console.log(`${key}: appended "${next}"`);
}
console.log('file: ' + envFile);