// Bundle API checker — shared logic.
// Scans the built JS assets and reports any *absolute* API base baked in by
// Vite (e.g. http://localhost:4000/api/v1). After the fix the bundle only
// carries the same-origin base `/api/v1`, which goes through the nginx proxy.
// usage: node scripts/debug/bundle-scan.cjs [dir]
// (dir defaults to the live nginx docroot inside learnpilot-web)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function dockerCat(p) {
  return execFileSync('docker', ['exec', 'learnpilot-web', 'cat', p], {
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

function localFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) out.push(p);
    }
  };
  walk(dir);
  return out;
}

// Any http(s)://host/api/v1 baked in means the browser bypasses nginx.
function absoluteRefs(body) {
  const hits = new Set();
  for (const m of body.matchAll(/https?:\/\/[A-Za-z0-9:._-]+\/api\/v1/g)) hits.add(m[0]);
  return [...hits];
}

function scan(bodies) {
  return bodies.map(([name, body]) => ({ name, absolute: absoluteRefs(body) }));
}

function report(rows) {
  const bad = rows.filter((r) => r.absolute.length);
  console.log(`files=${rows.length} filesWithAbsoluteApiBase=${bad.length}`);
  for (const r of bad) console.log('  ' + r.name + ' :: ' + r.absolute.join(', '));
  return bad.length ? 1 : 0;
}

const dir = process.argv[2];
if (dir) {
  const bodies = localFiles(dir).map((f) => [f, fs.readFileSync(f, 'utf8')]);
  process.exit(report(scan(bodies)));
}

// default: live container docroot
try {
  const html = dockerCat('/usr/share/nginx/html/index.html');
  const assets = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  if (!assets.length) {
    console.log('FAIL no bundled assets in index.html');
    process.exit(1);
  }
  const bodies = assets.map((a) => [a, dockerCat('/usr/share/nginx/html' + a)]);
  process.exit(report(scan(bodies)));
} catch (e) {
  console.log('FAIL', e.message);
  process.exit(1);
}