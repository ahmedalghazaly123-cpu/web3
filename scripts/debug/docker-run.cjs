// helper: run a docker command synchronously and print the output (optionally
// filtered by a regex passed as --grep=<re>). Avoids cmd.exe quoting traps.
// usage: node scripts/debug/docker-run.cjs --grep=OLLAMA compose config server
const { execSync } = require('child_process');
const path = require('path');

const argv = process.argv.slice(2);
const grepArg = argv.find((a) => a.startsWith('--grep='));
const args = argv.filter((a) => !a.startsWith('--grep='));
if (!args.length) {
  console.error('usage: node scripts/debug/docker-run.cjs [--grep=<re>] <docker args...>');
  process.exit(1);
}
const root = path.join(__dirname, '..', '..');
const cmd = 'docker ' + args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');

try {
  const out = execSync(cmd, { cwd: root, encoding: 'utf8', windowsHide: true, shell: 'cmd.exe', timeout: 120000 });
  const lines = out.split(/\r?\n/);
  const filtered = grepArg ? lines.filter((l) => new RegExp(grepArg.slice(7), 'i').test(l)) : lines;
  console.log(filtered.join('\n').trim() || '(no output)');
} catch (e) {
  const txt = ((e.stdout || '') + (e.stderr || '') + ' ' + e.message).toString();
  console.log(txt.split(/\r?\n/).filter((l) => l.trim()).slice(0, 40).join('\n'));
  process.exit(1);
}