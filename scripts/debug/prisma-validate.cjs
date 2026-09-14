// helper: validate prisma schema with a dummy DATABASE_URL (avoids shell quoting issues on win cmd)
process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/x';
const { execSync } = require('child_process');
try {
  execSync('node server/node_modules/prisma/build/index.js validate --schema server/prisma/schema.prisma', { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
