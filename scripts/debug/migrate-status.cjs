const { execSync } = require('child_process');
const fs = require('fs');

// load server/.env manually
const envText = fs.readFileSync('server/.env', 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

try {
  const out = execSync(
    'node server/node_modules/prisma/build/index.js migrate status --schema server/prisma/schema.prisma',
    { encoding: 'utf8', env: process.env }
  );
  console.log(out);
} catch (e) {
  console.log((e.stdout || '') + (e.stderr || ''));

// 3) direct DB inspection
const q = 'SELECT count(*) FROM _prisma_migrations';
try {
  const out = execSync('docker exec learnpilot-postgres psql -U learnpilot -d learnpilot -t -A -c ' + q, { encoding: 'utf8' });
  console.log('_prisma_migrations rows (db learnpilot):', out.trim());
} catch (e) {
  console.log('q failed:', (e.stderr || e.message).slice(0, 300));
}
try {
  const out = execSync('docker exec learnpilot-postgres psql -U learnpilot -d learnpilot -t -A -c "SELECT schemaname FROM pg_tables WHERE tablename = \'users\'"', { encoding: 'utf8' });
  console.log('users table schema:', out.trim());
} catch (e) {
  console.log('schema q failed:', (e.stderr || e.message).slice(0, 300));
}

  process.exit(e.status || 1);
}
