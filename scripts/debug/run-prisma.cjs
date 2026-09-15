const c = require('child_process');
const path = require('path');
const fs = require('fs');

const serverDir = path.join(__dirname, '..', '..', 'server');
const logFile = path.join(__dirname, 'prisma-migrate.log');

// Supports both prisma CLI passthrough (`migrate status`) and npm scripts
// (`db:seed`, `db:migrate`) from server/package.json.
const raw = process.argv.slice(2).length ? process.argv.slice(2).join(' ') : 'migrate status';
const useNpm = /^(db:|test|build|start|lint|dev)/.test(raw.trim());
const cmd = useNpm ? 'npm run ' + raw : 'npx prisma ' + raw.split(' ').map((a) => '"' + a + '"').join(' ');

fs.writeFileSync(logFile, 'CMD: ' + cmd + '\nCWD: ' + serverDir + '\n---\n');
const env = { ...process.env };
env.DATABASE_URL = 'postgresql://learnpilot:learnpilot_dev@127.0.0.1:5432/learnpilot?schema=public';
try {
  const out = c.execSync(cmd, { cwd: serverDir, env, timeout: 120000, windowsHide: true, shell: 'cmd.exe' });
  fs.appendFileSync(logFile, String(out) + '\nEXIT: 0\n');
  console.log('done ok');
} catch (e) {
  fs.appendFileSync(logFile, (e.stdout ? String(e.stdout) : '') + '\n' + (e.stderr ? String(e.stderr) : '') + '\nMSG: ' + e.message + '\nEXIT: FAIL\n');
  console.log('done fail:', e.message);
}
