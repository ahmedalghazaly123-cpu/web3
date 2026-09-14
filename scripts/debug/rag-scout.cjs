const { execFileSync } = require('child_process');
const fs = require('fs');

const env = {};
for (const line of fs.readFileSync('server/.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=(.*)$/);
  if (m) env[m[1]] = m[2];
}
console.log('HF key present:', !!env.HUGGINGFACE_API_KEY || !!env.HF_API_KEY || !!env.HUGGINGFACE_TOKEN);
console.log('env keys:', Object.keys(env).filter(k => /HF|HUG|OPENAI|GEMINI|GOOGLE/.test(k)).join(', '));

function q(sql) {
  try {
    return execFileSync('docker', [
      'exec', 'learnpilot-postgres', 'psql', '-U', 'learnpilot', '-d', 'learnpilot', '-t', '-A', '-c', sql,
    ], { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'ERR: ' + (e.stderr || e.message).slice(0, 200);
  }
}
console.log('lessons:', q('SELECT count(*) FROM lessons'));
console.log('courses:', q('SELECT count(*) FROM courses'));
console.log('courses with lessons:', q("SELECT count(DISTINCT l.\"courseId\") FROM lessons l WHERE l.\"courseId\" IS NOT NULL"));
console.log('lesson content sample:', q('SELECT left(content, 120) FROM lessons WHERE content IS NOT NULL AND length(content) > 50 LIMIT 1'));
console.log('course_chunks table exists:', q("SELECT count(*) FROM pg_tables WHERE tablename='course_chunks'"));
console.log('pgvector available:', q("SELECT count(*) FROM pg_available_extensions WHERE name='vector'"));
