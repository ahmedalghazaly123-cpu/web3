// Verify a REMOTE self-hosted LLM (Oracle Cloud Always Free / any VPS running
// Ollama) BEFORE wiring it into the AI cascade. The cascade supports TWO slots
// and this script proves which one your endpoint satisfies:
//
//   custom slot -> ${CUSTOM_LLM_BASE_URL}/chat/completions  (sends Bearer token)
//   ollama slot -> ${OLLAMA_BASE_URL}/api/chat              (sends NO token)
//
// usage:
//   node scripts/debug/remote-llm-check.cjs <base-url> [model] [--token=SECRET] [--quick]
//
// examples:
//   node scripts/debug/remote-llm-check.cjs http://localhost:11434 qwen2.5:3b
//   node scripts/debug/remote-llm-check.cjs https://llm.example.com qwen2.5:3b --token=s3cr3t
//
// The token is optional. Without one, a PASS on a PUBLIC address means the whole
// internet can use your model -> see the security notes in docs/PROJECT_STATE.md.
const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
const tokenArg = (argv.find((a) => a.startsWith('--token=')) || '').slice('--token='.length);
const skipGen = argv.includes('--quick');

const base = (positional[0] || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const model = positional[1] || process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const token = tokenArg || process.env.CUSTOM_LLM_API_KEY || '';

const isPrivate = /localhost|127\.0\.0\.1|::1|host\.docker\.internal|\.local|100\.\d+\.\d+\.\d+/.test(base);
let failures = 0;

const pass = (label, extra) => console.log(`PASS  ${label}${extra ? `  ::  ${extra}` : ''}`);
const fail = (label, extra) => {
  failures++;
  console.log(`FAIL  ${label}${extra ? `  ::  ${extra}` : ''}`);
};

async function tryFetch(url, init, timeoutMs) {
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    return { ok: res.ok, status: res.status, json, text, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: e.message, ms: Date.now() - started, error: e.message };
  }
}

const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

(async () => {
  console.log(`base  : ${base}`);
  console.log(`model : ${model}`);
  console.log(`token : ${token ? '(provided)' : '(none)'}`);
  console.log('');

  // ── 1) native Ollama tags (no auth header) — what the `ollama` slot probes ──
  const tags = await tryFetch(`${base}/api/tags`, {}, 10000);
  if (tags.ok && Array.isArray(tags.json?.models)) {
    pass('native /api/tags', `${tags.json.models.length} model(s) in ${tags.ms}ms -> ollama slot OK`);
    const names = tags.json.models.map((m) => m.name);
    console.log(`      models: ${names.join(', ') || '(none pulled)'}`);
    if (!token && !isPrivate) {
      console.log('      WARNING: this endpoint answers WITHOUT a token from a public address.');
      console.log('      Anything on the internet can use your model -> use Tailscale or a token-guarded proxy.');
    }
  } else {
    fail('native /api/tags', tags.error ? `err: ${tags.error}` : `http ${tags.status}`);
  }

  // ── 2) OpenAI-compatible /v1/models — what the `custom` slot probes ──
  const v1models = await tryFetch(`${base}/v1/models`, { headers: authHeader }, 10000);
  if (v1models.ok && Array.isArray(v1models.json?.data)) {
    pass('openai /v1/models', `${v1models.json.data.length} model(s) in ${v1models.ms}ms -> custom slot OK`);
  } else {
    fail('openai /v1/models', v1models.error ? `err: ${v1models.error}` : `http ${v1models.status}`);
  }

  if (skipGen) {
    console.log('\n(--quick: skipping real generations)');
  } else {
    const prompt = 'Reply with exactly: ok';

    // ── 3) real generation through the OpenAI-compatible path (custom slot) ──
    const chat = await tryFetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 64 }),
    }, 240000);
    if (chat.ok) {
      const content = (chat.json?.choices?.[0]?.message?.content || '').trim();
      const tokens = chat.json?.usage?.completion_tokens || Math.max(1, Math.round(content.length / 4));
      const tps = (tokens / Math.max(1, chat.ms / 1000)).toFixed(1);
      pass('generate /v1/chat/completions', `${chat.ms}ms, ~${tokens} tok, ~${tps} tok/s :: "${content.slice(0, 40)}"`);
    } else {
      fail('generate /v1/chat/completions', chat.error ? `err: ${chat.error}` : `http ${chat.status}`);
    }

    // ── 4) real generation through the native path (ollama slot) ──
    const native = await tryFetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false }),
    }, 240000);
    if (native.ok) {
      const content = (native.json?.message?.content || '').trim();
      const tokens = native.json?.eval_count || Math.max(1, Math.round(content.length / 4));
      const evalNs = native.json?.eval_duration || 0;
      const tps = evalNs ? (tokens / (evalNs / 1e9)).toFixed(1) : '?';
      pass('generate /api/chat', `${native.ms}ms, ${tokens} tok, ${tps} tok/s :: "${content.slice(0, 40)}"`);
    } else {
      fail('generate /api/chat', native.error ? `err: ${native.error}` : `http ${native.status}`);
    }
  }

  console.log('');
  if (failures) {
    console.log(`${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('All checks passed. Wire it with ONE of these in server/.env:');
  console.log('  custom slot (priority #1, sends the token):');
  console.log(`    CUSTOM_LLM_BASE_URL=${base}/v1`);
  console.log(`    CUSTOM_LLM_MODEL=${model}`);
  console.log('    CUSTOM_LLM_API_KEY=<your-token-or-any-string>');
  console.log('  ollama slot (last fallback, NO token sent -> needs a private network):');
  console.log('    OLLAMA_ENABLED=true');
  console.log(`    OLLAMA_BASE_URL=${base}`);
  console.log(`    OLLAMA_MODEL=${model}`);
})().catch((e) => {
  console.error(`remote-llm-check crashed -> ${e.message}`);
  process.exit(1);
});
