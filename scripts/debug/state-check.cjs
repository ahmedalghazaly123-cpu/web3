const { execSync } = require('child_process');
const fs = require('fs');

// 1) migration status
const q = 'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY migration_name';
try {
  const out = execSync(
    ['docker', 'exec', 'learnpilot-postgres', 'psql', '-U', 'learnpilot', '-d', 'learnpilot', '-t', '-A', '-c', q].join(' '),
    { encoding: 'utf8' }
  );
  console.log('MIGRATIONS:\n' + out);
} catch (e) {
  console.log('migration query failed:', (e.stderr || e.message).slice(0, 500));
}

// 2) lucide-react versions
console.log('installed lucide-react:', JSON.parse(fs.readFileSync('node_modules/lucide-react/package.json', 'utf8')).version);
console.log('declared lucide-react:', JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies['lucide-react']);

