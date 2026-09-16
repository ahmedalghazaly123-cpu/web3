/**
 * Discover which OpenRouter models are actually FREE (`:free` / zero price) and
 * probe them with a minimal chat so the OPENROUTER_MODEL list can be pinned to
 * models that truly answer (not just exist).
 * Usage: node scripts/debug/openrouter-models.cjs [--list] [--probe]
 *   --list   just print the free model ids found on the account
 *   --probe  also send a 1-word chat to each (slower, spends free quota)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const doList = args.includes('--list') || args.length === 0;
const doProbe = args.includes('--probe');

function envKey(name) {
  const p = path.join(__dirname, '..', '..', 'server', '.env');
  const m = fs.readFileSync(p, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

const KEY = envKey('OPENROUTER_API_KEY');
const BASE = 'https://openrouter.ai/api/v1';
const HEADERS = {
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'http://localhost:3000',
  'X-Title': 'LearnPilot',
};

async function probe(model) {
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word READY.' }],
        max_tokens: 8,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return `FAIL ${res.status} ${(await res.text()).replace(/\s+/g, ' ').slice(0, 90)}`;
    const j = await res.json();
    const text = String(j?.choices?.[0]?.message?.content ?? '').trim().slice(0, 30);
    return `OK   "${text}"`;
  } catch (e) {
    return `FAIL ${e.message}`;
  }
}

(async () => {
  if (!KEY) {
    console.log('OPENROUTER_API_KEY not set in server/.env');
    process.exit(1);
  }
  const res = await fetch(`${BASE}/models`, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    console.log('models request failed:', res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const all = (await res.json()).data || [];
  const free = all.filter((m) => m.id.endsWith(':free'));
  const zeroPrice = all.filter(
    (m) => !m.id.endsWith(':free') && Number(m?.pricing?.prompt ?? -1) === 0 && Number(m?.pricing?.completion ?? -1) === 0,
  );
  console.log(`openrouter: ${all.length} models total | ${free.length} tagged ':free' | ${zeroPrice.length} zero-priced`);

  if (doList) {
    console.log("\n--- ':free' tagged models ---");
    free.forEach((m) => console.log('  ' + m.id));
    if (zeroPrice.length) {
      console.log('\n--- zero-priced (no :free tag) ---');
      zeroPrice.forEach((m) => console.log('  ' + m.id));
    }
  }

  if (doProbe) {
    // Probe the list currently configured in server/.env, else all tagged ':free'.
    const configured = (envKey('OPENROUTER_MODEL') || process.env.OPENROUTER_MODEL || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const targets = configured.length ? configured : free.map((m) => m.id);
    console.log(`\n--- probing ${targets.length} model(s) ---`);
    // Probe in small parallel batches: free models often hang until timeout,
    // and sequential probing of 20 would take many minutes.
    const BATCH = 5;
    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH);
      const results = await Promise.all(batch.map((m) => probe(m)));
      results.forEach((r, j) => console.log(`${batch[j].padEnd(52)} ${r}`));
    }
  }
})();