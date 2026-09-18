// Scan every built asset for a set of needles.
//   node scripts/debug/dist-scan.cjs invitePlaceholder inviteRequired Ahmed
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.cwd(), 'dist', 'assets');
const needles = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => /\.(js|css|html)$/.test(f));
for (const n of needles) {
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    let count = 0;
    let i = text.indexOf(n);
    while (i !== -1) { count++; i = text.indexOf(n, i + n.length); }
    if (count) hits.push(`${f}:${count}`);
  }
  console.log(`${n} -> ${hits.length ? hits.join(' ') : 'NOT FOUND'}`);
}
