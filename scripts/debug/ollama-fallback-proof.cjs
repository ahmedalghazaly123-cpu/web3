// Proof that the self-hosted Ollama fallback actually serves completions from
// INSIDE the server container, using the exact request the AI cascade makes
// (baseUrl + /api/chat with { model, messages, stream:false }).
//
// Run inside the container:
//   docker cp scripts/debug/ollama-fallback-proof.cjs learnpilot-server:/tmp/p.cjs
//   docker exec learnpilot-server node /tmp/p.cjs
const BASE = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

(async () => {
  const started = Date.now();

  // 1. the daemon answering from inside the container (proves host.docker.internal routing)
  const tags = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(8000) });
  const tagJson = await tags.json();
  const models = (tagJson.models || []).map((m) => m.name);
  console.log(`reachable from container : yes (http ${tags.status})`);
  console.log(`models visible           : ${models.join(', ') || '(none)'}`);
  if (!models.length) throw new Error('no model pulled — run: ollama pull ' + MODEL);

  // 2. a real completion on the model the cascade falls back to
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: 'Reply with exactly: fallback-ok' }],
      stream: false,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`chat failed: http ${res.status}`);
  const data = await res.json();
  const content = (data.message && data.message.content ? data.message.content : '').trim();
  if (!content) throw new Error('empty completion content');

  console.log(`completion model         : ${data.model || MODEL}`);
  console.log(`completion chars         : ${content.length}`);
  console.log(`latency                  : ${Date.now() - started}ms`);
  console.log(`content preview          : ${content.slice(0, 80).replace(/\s+/g, ' ')}`);
  console.log('\nRESULT: Ollama fallback works from inside the container ✔');
})().catch((e) => {
  console.error(`\nRESULT: fallback proof FAILED -> ${e.message}`);
  process.exit(1);
});