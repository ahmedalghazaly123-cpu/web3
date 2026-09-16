// helper: probe every AI provider key and print name + HTTP status ONLY.
// No key, token or model content is ever printed.
// usage: node scripts/debug/verify-providers.cjs [envFile]
const fs = require('fs');
const path = require('path');

const envFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'server', '.env');

const map = {};
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) map[m[1]] = m[2].trim();
}

async function probe(name, url, headers, timeoutMs = 15000) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    await r.text().catch(() => '');
    console.log(`${name}: HTTP ${r.status}${r.ok ? ' OK' : ''}`);
    return r.ok;
  } catch (e) {
    console.log(`${name}: ERROR (${e.message})`);
    return false;
  }
}

(async () => {
  const out = [];
  const bear = (k) => ({ Authorization: `Bearer ${map[k]}` });
  if (map.GROQ_API_KEY) out.push(await probe('groq', 'https://api.groq.com/openai/v1/models', bear('GROQ_API_KEY')));
  if (map.OPENROUTER_API_KEY) out.push(await probe('openrouter', 'https://openrouter.ai/api/v1/models', bear('OPENROUTER_API_KEY')));
  if (map.CEREBRAS_API_KEY) out.push(await probe('cerebras', 'https://api.cerebras.ai/v1/models', bear('CEREBRAS_API_KEY')));
  if (map.MISTRAL_API_KEY) out.push(await probe('mistral', 'https://api.mistral.ai/v1/models', bear('MISTRAL_API_KEY')));
  if (map.DEEPINFRA_API_KEY) out.push(await probe('deepinfra', 'https://api.deepinfra.com/v1/openai/models', bear('DEEPINFRA_API_KEY')));
  if (map.HUGGINGFACE_API_KEY) out.push(await probe('huggingface', 'https://router.huggingface.co/v1/models', bear('HUGGINGFACE_API_KEY')));
  if (map.GITHUB_TOKEN) out.push(await probe('github-token-valid', 'https://api.github.com/user', bear('GITHUB_TOKEN')));
  if (map.GOOGLE_AI_API_KEY) {
    out.push(await probe('google', `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(map.GOOGLE_AI_API_KEY)}`, {}));
  }
  console.log(`probed ${out.length}, ok ${out.filter(Boolean).length}`);
})();
