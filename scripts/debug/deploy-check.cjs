// End-to-end deployment check for the Docker stack:
//   browser -> nginx (:3000) -> express (:4000) -> postgres, plus the AI chain.
// usage: node scripts/debug/deploy-check.cjs
const WEB = process.env.WEB_BASE || 'http://localhost:3000';
const API = process.env.API_BASE || 'http://localhost:4000/api/v1';

let pass = 0;
let fail = 0;

function ok(name, detail) {
  console.log(`PASS  ${name}${detail ? '  ::  ' + detail : ''}`);
  pass++;
}
function no(name, detail) {
  console.log(`FAIL  ${name}${detail ? '  ::  ' + detail : ''}`);
  fail++;
}

async function j(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json, text, headers: res.headers };
}

(async () => {
  // 1. nginx serves the SPA
  try {
    const r = await j(WEB);
    const mounted = r.text.includes('id="root"');
    r.status === 200 && mounted ? ok('nginx serves SPA', `200, ${r.text.length} bytes, #root present`) : no('nginx serves SPA', `status=${r.status} mounted=${mounted}`);
  } catch (e) {
    no('nginx serves SPA', e.message);
  }

  // 2. SPA fallback for client-side routes (deep links must not 404)
  try {
    const r = await j(`${WEB}/planner`);
    r.status === 200 && r.text.includes('id="root"') ? ok('SPA deep link /planner', '200 (history fallback works)') : no('SPA deep link /planner', `status=${r.status}`);
  } catch (e) {
    no('SPA deep link /planner', e.message);
  }

  // 3. nginx /api proxy reaches express (real endpoint, not just /health)
  try {
    const r = await j(`${WEB}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@learnpilot.dev', password: 'learnpilot' }),
    });
    r.status === 200 && r.json?.token ? ok('nginx -> /api proxy -> express', `200, login ok, role=${r.json.user.role}`) : no('nginx -> /api proxy -> express', `status=${r.status} body=${r.text.slice(0, 80)}`);
  } catch (e) {
    no('nginx -> /api proxy -> express', e.message);
  }

  // 4. the built bundle must not pin an absolute API base (same-origin /api/v1)
  try {
    const home = await j(WEB);
    const assets = [...home.text.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
    const bad = [];
    for (const a of assets) {
      const body = (await j(WEB + a)).text;
      const refs = [...body.matchAll(/https?:\/\/[A-Za-z0-9:._-]+\/api\/v1/g)].map((m) => m[0]);
      if (refs.length) bad.push(`${a} :: ${[...new Set(refs)].join(', ')}`);
    }
    bad.length === 0
      ? ok('bundle API base', `same-origin /api/v1 (no absolute refs) in ${assets.length} asset(s)`)
      : no('bundle API base', `absolute refs found: ${bad.join(' | ')}`);
  } catch (e) {
    no('bundle API base', e.message);
  }

  // 5. AI provider chain + Ollama reachability from inside the container
  let token = null;
  try {
    const r = await j(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@learnpilot.dev', password: 'learnpilot' }),
    });
    token = r.json?.token;
  } catch {
    /* handled below */
  }
  if (!token) {
    no('AI status', 'could not log in');
  } else {
    try {
      const r = await j(`${API}/ai/status`, { headers: { Authorization: `Bearer ${token}` } });
      const o = r.json?.ollama || {};
      const names = (o.models || []).map((m) => m.name || m).join(',') || '(none)';
      o.reachable ? ok('ollama reachable from server container', `models=${names}`) : no('ollama reachable from server container', `enabled=${o.enabled} reachable=${o.reachable}`);
      ok('ai chain', `providers=${(r.json?.chain || []).map((c) => c.name).join(' > ')}`);
    } catch (e) {
      no('AI status', e.message);
    }
  }

  // 6. database round-trip through the API (course/lesson read)
  if (token) {
    try {
      const r = await j(`${API}/courses`, { headers: { Authorization: `Bearer ${token}` } });
      const n = Array.isArray(r.json?.courses) ? r.json.courses.length : Array.isArray(r.json) ? r.json.length : -1;
      r.status === 200 ? ok('courses read from postgres', `${n} course(s)`) : no('courses read from postgres', `status=${r.status}`);
    } catch (e) {
      no('courses read from postgres', e.message);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();