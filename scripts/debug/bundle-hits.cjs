// Count occurrences of strings in a built bundle (deploy verification helper).
// usage: node scripts/debug/bundle-hits.cjs dist/assets/index-XXXX.js "a" "b" ...
const fs = require('fs');
const file = process.argv[2];
const s = fs.readFileSync(file, 'utf8');
console.log(`${file} bytes=${s.length} mtime=${fs.statSync(file).mtime.toISOString()}`);
for (const k of process.argv.slice(3)) {
  let c = 0;
  let i = 0;
  while ((i = s.indexOf(k, i)) >= 0) {
    c++;
    i += k.length;
  }
  console.log(`${c}\t${k}`);
}