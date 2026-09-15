// Real generation round-trip through the AI cascade
// (proves Ollama answers from inside the container, not just /api/tags).
// usage: node scripts/debug/ai-generate-check.cjs [prompt]
const API = process.env.API_BASE || 'http://localhost:4000/api/v1';
const prompt = process.argv[2] || 'Reply with the single word READY if you can read this.';

(async () => {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@learnpilot.dev', password: 'learnpilot' }),
  });
  const { token } = await login.json();
  if (!token) {
    console.log('FAIL login', login.status);
    process.exit(1);
  }
  console.log('login ok, asking:', JSON.stringify(prompt));
  const t0 = Date.now();
  const res = await fetch(`${API}/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt, mode: 'assist', language: 'en' }),
  });
  const ms = Date.now() - t0;
  const json = await res.json().catch(() => ({}));
  console.log(`status=${res.status} provider=${json.provider} model=${json.model} latency=${json.latencyMs ?? ms}ms`);
  console.log('content:', JSON.stringify(String(json.content).slice(0, 400)));
  if (res.status !== 200 || !json.content) process.exit(1);
})().catch((e) => {
  console.log('FAIL', e.message);
  process.exit(1);
});