// helper: run read-only db checks via docker (avoids win cmd quoting issues)
const { execSync } = require('child_process');
function q(sql) {
  const out = execSync('docker exec learnpilot-postgres psql -U learnpilot -d learnpilot -t -A -c ' + JSON.stringify(sql), { encoding: 'utf8' });
  return out.trim();
}
try {
  console.log('--- tables ---');
  console.log(q("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;"));
  console.log('--- users ---');
  console.log(q('SELECT count(*) FROM users;'));
  console.log('--- courses / modules / lessons / enrollments (seed) ---');
  console.log(
    q(
      "SELECT 'courses='||(SELECT count(*) FROM courses)||' modules='||(SELECT count(*) FROM modules)||' lessons='||(SELECT count(*) FROM lessons)||' enrollments='||(SELECT count(*) FROM enrollments);",
    ),
  );
  console.log('--- new feature tables (voice / sandbox / rooms) ---');
  console.log(
    q(
      "SELECT 'voice_sessions='||(SELECT count(*) FROM voice_sessions)||' voice_messages='||(SELECT count(*) FROM voice_messages)||' sandbox_runs='||(SELECT count(*) FROM sandbox_runs)||' live_rooms='||(SELECT count(*) FROM live_rooms)||' room_messages='||(SELECT count(*) FROM room_messages);",
    ),
  );
  console.log('--- learning_events ---');
  console.log(q('SELECT count(*) FROM learning_events;'));
  console.log('--- ai_usage ---');
  console.log(q('SELECT count(*) FROM ai_usage;'));
} catch (e) {
  console.error('DB check failed (is container up? run: docker start learnpilot-postgres)');
  process.exit(1);
}
