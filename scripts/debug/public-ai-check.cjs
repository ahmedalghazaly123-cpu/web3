// Does the AI work for a friend using the public link? Signs a throwaway account
// up *through the public origin* (same-origin /api, exactly like the browser) and
// reads /api/v1/ai/status — plus one real generation to prove the provider
// cascade answers. Prints provider names/flags only, never a key.
//
// usage: node scripts/debug/public-ai-check.cjs [webBase]
const WEB = (process.argv[2] || 'https://frontend-production-a628e.up.railway.app').replace(/\/$/, '');
const API = `${WEB}/api/v1`;

let pass = 0;
let fail = 0;
const check = (ok, label, extra = '') => {
  if (ok) {
    pass++;
    console.log(`PASS  ${label}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`FAIL  ${label}${extra ? ` — ${extra}` : ''}`);
  }
};

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body, text };
}

(async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const email = `aicheck-${stamp}@example.com`;

  const su = await req('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'StudentPass123!', name: 'AI Check', role: 'student' }),
  });
  check(su.status === 201 && !!su.body?.token, 'signup through the public link', `status=${su.status}`);
  const token = su.body?.token;
  if (!token) {
    console.log('\ncannot continue without a token');
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${token}` };

  const st = await req('/ai/status', { headers: auth });
  const b = st.body || {};
  // /ai/status exposes the wired cascade as `chain: [{ name, models }]` — that is
  // the authoritative list of providers this container actually has keys for.
  const chain = Array.isArray(b.chain) ? b.chain.map((c) => c.name) : [];
  const cloud = chain.filter((n) => !/custom|ollama|demo/i.test(n));
  check(st.status === 200, 'GET /ai/status answers', `status=${st.status}`);
  check(chain.length > 0, 'provider chain is not empty', chain.join(', ') || 'none');
  check(cloud.length > 0, 'cloud providers wired on the server', `${cloud.length} → ${cloud.join(', ') || 'none'}`);
  check(b.ollama?.enabled === false, 'ollama disabled on the server', `enabled=${b.ollama?.enabled}`);

  // One real generation proves the cascade works end to end (not just config).
  // `mode` is required by aiRequestSchema (an invalid body would silently land in
  // the demo fallback), so send a real payload exactly like the SPA does.
  const gen = await req('/ai/generate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ prompt: 'Reply with exactly: ok', mode: 'assist', language: 'en' }),
  });
  const content = gen.body?.content ?? gen.body?.text ?? '';
  const used = gen.body?.provider || '?';
  check(gen.status === 200, 'POST /ai/generate answers', `status=${gen.status}`);
  check(used !== 'local-demo', 'generation used a real provider', `provider=${used}${gen.body?.error ? ` error=${gen.body.error}` : ''}`);
  check(typeof content === 'string' && content.trim().length > 0, 'generation returned content', `${String(content).slice(0, 60)}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('public-ai-check error:', e.message);
  process.exit(1);
});