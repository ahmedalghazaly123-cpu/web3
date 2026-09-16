// helper: set KEY=VALUE pairs from a JSON file WITHOUT printing values.
// For pasting secrets: only key names + lengths are printed, never the secret.
// usage: node scripts/debug/putenv-silent.cjs <jsonFile> [envFile]
const fs = require('fs');
const path = require('path');

const jsonFile = path.resolve(process.argv[2]);
const envFile = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(__dirname, '..', '..', 'server', '.env');

const pairs = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8').split(/\r?\n/) : [];
for (const [key, value] of Object.entries(pairs)) {
  const idx = lines.findIndex((l) => new RegExp('^\\s*' + key + '\\s*=').test(l));
  const next = `${key}=${value}`;
  if (idx >= 0) {
    lines[idx] = next;
  } else {
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    lines.push(next, '');
  }
  console.log(`${key}: OK (${String(value).length} chars)`);
}
fs.writeFileSync(envFile, lines.join('\n'));
console.log('file: ' + envFile);
