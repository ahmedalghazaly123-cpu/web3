// helper: diff migrations vs schema datamodel using the live docker postgres as shadow
process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/x';
const { execSync } = require('child_process');
const shadow = 'postgresql://learnpilot:learnpilot_dev@localhost:5432/learnpilot_shadow';
try {
  execSync('docker exec learnpilot-postgres psql -U learnpilot -c "CREATE DATABASE learnpilot_shadow;"', { stdio: 'pipe' });
} catch (e) { /* may already exist */ }
try {
  const cmd = 'node server/node_modules/prisma/build/index.js migrate diff --from-migrations server/prisma/migrations --to-schema-datamodel server/prisma/schema.prisma --shadow-database-url ' + shadow;
  execSync(cmd, { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
