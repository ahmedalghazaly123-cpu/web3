// helper: print the NAME (never the value) of every variable in an env file,
// used to see what the docker-compose pass-through would pick up.
// usage: node scripts/debug/env-names.cjs server/.env
const fs = require('fs');
const file = process.argv[2] || 'server/.env';
if (!fs.existsSync(file)) {
  console.log(`(missing) ${file}`);
  process.exit(0);
}
const names = fs
  .readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
  .map((l) => l.split('=')[0].trim());
console.log(names.join('\n'));