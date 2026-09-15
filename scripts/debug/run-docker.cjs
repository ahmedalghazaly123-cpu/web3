// Docker wrapper: runs `docker <args...>` synchronously and appends full
// stdout+stderr to a log file (avoids Windows cmd quoting pain).
// Options: --grep=<pattern> prints only matching output lines to stdout.
// usage: node scripts/debug/run-docker.cjs [--grep=...] <docker args...>
const c = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..', '..');
const raw = process.argv.slice(2);
let grep = null;
const args = [];
for (const a of raw) {
  if (a.startsWith('--grep=')) grep = a.slice(7);
  else args.push(a);
}
if (!args.length) args.push('ps', '-a');
const quoted = args.map((a) => (a.includes(' ') ? '"' + a + '"' : a)).join(' ');
const cmd = 'docker ' + quoted;
// one fixed log per helper family so callers can always re-read the output
const family = args[0] === 'compose' ? 'compose' : args[0] === 'exec' ? 'exec' : args[0] || 'ps';
const logFile = path.join(__dirname, 'docker-' + family + '.log');

fs.writeFileSync(logFile, 'CMD: ' + cmd + '\n---\n');
try {
  const out = c.execSync(cmd, { cwd: rootDir, timeout: 600000, windowsHide: true, shell: 'cmd.exe' });
  fs.appendFileSync(logFile, String(out) + '\nEXIT: 0\n');
  const text = String(out);
  if (grep) {
    const re = new RegExp(grep, 'i');
    console.log(text.split(/\r?\n/).filter((l) => re.test(l)).join('\n') || '(no matching lines)');
  } else {
    console.log('done ok, see ' + logFile);
  }
} catch (e) {
  fs.appendFileSync(logFile, (e.stdout ? String(e.stdout) : '') + '\n' + (e.stderr ? String(e.stderr) : '') + '\nMSG: ' + e.message + '\nEXIT: FAIL\n');
  const all = String(e.stdout || '') + '\n' + String(e.stderr || '');
  if (grep) {
    const re = new RegExp(grep, 'i');
    console.log(all.split(/\r?\n/).filter((l) => re.test(l)).join('\n') || '(no matching lines)');
  } else {
    console.log('done fail, see ' + logFile);
  }
}
try {
  const out = c.execSync(cmd, { cwd: rootDir, timeout: 600000, windowsHide: true, shell: 'cmd.exe' });
  fs.appendFileSync(logFile, String(out) + '\nEXIT: 0\n');
  console.log('done ok, see ' + logFile);
} catch (e) {
  fs.appendFileSync(logFile, (e.stdout ? String(e.stdout) : '') + '\n' + (e.stderr ? String(e.stderr) : '') + '\nMSG: ' + e.message + '\nEXIT: FAIL\n');
  console.log('done fail, see ' + logFile);
}
