// helper: log in and print the AI provider cascade health from the live API.
// usage: node scripts/debug/ai-status.cjs
const BASE = process.env.LIVE_BASE || 'http://localhost:4000';

(async () => {
  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@learnpilot.dev', password: 'learnpilot' }),
  });
  if (!login.ok) {
    console.log(`login failed: ${login.status} (run the seed first)`);
    process.exit(1);
  }
  const { token } = await login.json();

  const res = await fetch(`${BASE}/api/v1/ai/status`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  console.log(`HTTP ${res.status}`);
  console.log(`default: ${data.default}`);
  console.log(`chain (${Array.isArray(data.chain) ? data.chain.length : 0} providers):`);
  for (const p of data.chain || []) console.log(`  - ${p.name}: ${(p.models || []).join(', ')}`);
  console.log(`custom: ${JSON.stringify(data.custom)}`);
  console.log(`ollama: ${JSON.stringify(data.ollama)}`);
  console.log(`fallback: ${data.fallback}`);
})();