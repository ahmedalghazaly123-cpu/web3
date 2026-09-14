const { execFileSync } = require('child_process');

function q(sql) {
  try {
    return execFileSync('docker', [
      'exec', 'learnpilot-postgres', 'psql', '-U', 'learnpilot', '-d', 'learnpilot', '-t', '-A', '-c', sql,
    ], { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'ERR: ' + (e.stderr || e.message).slice(0, 300);
  }
}

console.log('migration rows:\n' + q("SELECT migration_name || ' | finished=' || COALESCE(finished_at::text,'NO') || ' | applied=' || COALESCE(applied_steps_count::text,'?') FROM _prisma_migrations ORDER BY migration_name"));


