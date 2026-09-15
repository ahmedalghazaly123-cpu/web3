// Full "is my project in Docker and healthy?" report.
// Checks: compose project, containers, ports, web (nginx), API proxy through
// nginx, and the DB from inside the server container.
// usage: node scripts/debug/docker-status.cjs
const { execFileSync } = require('child_process');

const root = require('path').join(__dirname, '..', '..');

function sh(cmd, args, timeout = 30000) {
  try {
    return execFileSync(cmd, args, { cwd: root, timeout, windowsHide: true, encoding: 'utf8' }).trim();
  } catch (e) {
    return `ERROR: ${String(e.stdout || e.message).trim().split('\n')[0]}`;
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

(async () => {
  section('docker context');
  console.log(sh('docker', ['context', 'show']));

  section('compose project (docker compose ls -a)');
  console.log(sh('docker', ['compose', 'ls', '-a']) || '(none)');

  section('containers (docker ps -a)');
  console.log(sh('docker', ['ps', '-a', '--format', '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}']) || '(none)');

  section('compose services');
  console.log(sh('docker', ['compose', 'ps', '-a']) || '(none)');

  section('images built for this project');
  console.log(sh('docker', ['images', '--format', '{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}']).split('\n').filter((l) => /^(web3-|postgres|hello)/.test(l)).join('\n') || '(none)');

  section('HTTP checks from the host');
  for (const [label, url, opts] of [
    ['web (nginx)             ', 'http://localhost:3000/', null],
    ['api via nginx proxy     ', 'http://localhost:3000/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":"student@learnpilot.dev","password":"learnpilot"}' }],
    ['api direct              ', 'http://localhost:4000/health', null],
    ['api ready               ', 'http://localhost:4000/ready', null],
  ]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), ...(opts || {}) });
      const body = await res.text();
      console.log(`${label} ${res.status}  ${body.slice(0, 70).replace(/\s+/g, ' ')}`);
    } catch (e) {
      console.log(`${label} FAIL  ${e.message}`);
    }
  }

  section('database seen from the server container');
  console.log(
    sh('docker', ['exec', 'learnpilot-server', 'node', '-e',
      "fetch('http://localhost:4000/ready').then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(e=>console.log('ERR',e.message))",
    ]) || '(no output)',
  );
  console.log(sh('docker', ['exec', 'learnpilot-postgres', 'psql', '-U', 'learnpilot', '-d', 'learnpilot', '-t', '-A', '-c',
    "SELECT 'users='||(SELECT count(*) FROM users)||' courses='||(SELECT count(*) FROM courses)||' lessons='||(SELECT count(*) FROM lessons);",
  ]));

  section('ollama model availability');
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(4000) });
    const j = await res.json();
    const names = (j.models || []).map((m) => m.name);
    console.log(names.length ? names.join(', ') : '(no models pulled yet)');
  } catch (e) {
    console.log(`ollama not reachable: ${e.message}`);
  }
})();