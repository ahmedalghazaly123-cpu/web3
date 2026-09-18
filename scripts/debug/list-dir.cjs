// Lists a directory (works around cmd/PowerShell quoting pain for paths with spaces).
const fs = require('fs');
const path = require('path');
const filter = (process.argv[3] || '').toLowerCase();
const target = process.argv[2];
if (!target) {
  console.error('usage: node list-dir.cjs <dir> [filter]');
  process.exit(1);
}
if (!fs.existsSync(target)) {
  console.log('MISSING ' + target);
  process.exit(0);
}
const entries = fs.readdirSync(target, { withFileTypes: true });
const rows = entries
  .filter((e) => (filter ? e.name.toLowerCase().includes(filter) : true))
  .map((e) => (e.isDirectory() ? '[dir] ' : '      ') + e.name + ' @ ' + path.join(target, e.name));
console.log(rows.join('\n') || '(no matches)');
