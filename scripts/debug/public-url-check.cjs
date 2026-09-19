// Public-link check — verifies the *deployed* stack that friends open in a browser:
//   browser -> Vercel SPA  ->  Railway API  ->  postgres
// Nothing here touches localhost (see deploy-check.cjs for the Docker stack).
// usage:
//   node scripts/debug/public-url-check.cjs
//   node scripts/debug/public-url-check.cjs https://<web-host> https://<backend-host>
// (the same-host form also works: pass only the web host when nginx proxies /api there)
const WEB = (process.argv[2] || process.env.WEB_BASE || 'https://web3-1-five.vercel.app').replace(/\/$/, '');
const BACKEND = (process.argv[3] || process.env.BACKEND_URL || 'https://backend-production-ea96.up.railway.app').replace(/\/$/, '');
// A same-origin front end (nginx proxy) answers /api itself; a static host (Vercel)
// needs a rewrite, so callers can point API_BASE at either host explicitly.
const API = (process.argv[4] || process.env.API_BASE || `${WEB}/api/v1`).replace(/\/$/, '');

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
  const res = await fetch(url, { redirect: 'manual', ...opts });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html / empty */
  }
  return { status: res.status, json, text, headers: res.headers };
}

// A reachable API answers with a real HTTP status; a broken proxy answers 404/502/504.
const REACHABLE = new Set([200, 201, 400, 401, 403, 422]);

(async () => {
  console.log(`web     : ${WEB}`);
  console.log(`backend : ${BACKEND}`);
  console.log(`api     : ${API}\n`);

  // 1. the SPA is served
  try {
    const r = await j(WEB);
    r.status === 200 && r.text.includes('id="root"')
      ? ok('public link serves the SPA', `200, ${r.text.length} bytes, #root present`)
      : no('public link serves the SPA', `status=${r.status} mounted=${r.text.includes('id="root"')}`);
  } catch (e) {
    no('public link serves the SPA', e.message);
  }

  // 2. deep links work (a friend may share/refresh /planner, /dashboard, ...)
  try {
    const r = await j(`${WEB}/planner`);
    r.status === 200 && r.text.includes('id="root"')
      ? ok('SPA deep link /planner', '200 (history fallback works)')
      : no('SPA deep link /planner', `status=${r.status}`);
  } catch (e) {
    no('SPA deep link /planner', e.message);
  }

  // 3. the backend on Railway is alive
  try {
    const r = await j(`${BACKEND}/health`);
    r.status === 200 ? ok('railway backend /health', `200 ${JSON.stringify(r.json).slice(0, 80)}`) : no('railway backend /health', `status=${r.status}`);
  } catch (e) {
    no('railway backend /health', e.message);
  }

  // 4. and can reach its database
  try {
    const r = await j(`${BACKEND}/ready`);
    r.status === 200 ? ok('railway backend /ready (postgres)', `200 ${JSON.stringify(r.json).slice(0, 80)}`) : no('railway backend /ready (postgres)', `status=${r.status}`);
  } catch (e) {
    no('railway backend /ready (postgres)', e.message);
  }

  // 5. friends' browser calls /api/* on the SAME origin as the SPA
  try {
    const r = await j(`${WEB}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'not-a-real-password' }),
    });
    REACHABLE.has(r.status)
      ? ok('same-origin /api/v1 on the public link', `${r.status} (proxy reaches express)`)
      : no('same-origin /api/v1 on the public link', `status=${r.status} body=${r.text.slice(0, 80)}`);
  } catch (e) {
    no('same-origin /api/v1 on the public link', e.message);
  }

  // 6. direct API access from the SPA origin must pass CORS (OAuth / fetch fallbacks)
  try {
    const pre = await j(`${API}/auth/me`, {
      method: 'OPTIONS',
      headers: {
        Origin: WEB,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    const acao = pre.headers.get('access-control-allow-origin');
    acao && (acao === WEB || acao === '*')
      ? ok('CORS allows the public link', `Access-Control-Allow-Origin: ${acao}`)
      : no('CORS allows the public link', `acao=${acao} status=${pre.status} → add ${WEB} to CORS_ORIGIN on Railway`);
  } catch (e) {
    no('CORS allows the public link', e.message);
  }

  // 7. Google login must start from the public origin (redirect, not 404/500)
  try {
    const r = await j(`${API}/auth/google`);
    [301, 302, 303, 307].includes(r.status)
      ? ok('OAuth start /auth/google', `${r.status} -> ${(r.headers.get('location') || '').slice(0, 60)}`)
      : no('OAuth start /auth/google', `status=${r.status} body=${r.text.slice(0, 80)}`);
  } catch (e) {
    no('OAuth start /auth/google', e.message);
  }

  // 8. bundle must load from the public domain (no localhost left inside)
  try {
    const home = await j(WEB);
    const assets = [...home.text.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
    const bad = [];
    for (const a of assets) {
      const body = (await j(/^https?:/.test(a) ? a : WEB + a)).text;
      for (const hit of new Set([...body.matchAll(/https?:\/\/localhost:[0-9]+/g)].map((m) => m[0]))) bad.push(`${a} :: ${hit}`);
    }
    assets.length > 0 && bad.length === 0
      ? ok('bundle has no localhost URLs', `${assets.length} asset(s) loaded from the public domain`)
      : no('bundle has no localhost URLs', bad.length ? bad.join(' | ') : 'no assets found in index.html');
  } catch (e) {
    no('bundle has no localhost URLs', e.message);
  }

  console.log(`\n${pass}/${pass + fail} checks passed`);
  process.exit(fail === 0 ? 0 : 1);
})();