/**
 * Evaluate OpenRouter free models with a REAL tutor-style prompt so we can see
 * which ones answer cleanly (no leaked reasoning, no empty content) before
 * pinning them in the OPENROUTER_MODEL default list.
 *
 * Usage: node scripts/debug/or-eval.cjs [--sys] [model ...]
 *
 * --sys adds a "final answer only" system message to test whether a model that
 * leaks its chain-of-thought can be tamed before we resort to dropping it.
 */
'use strict';
const fs = require('fs');
const path = require('path');

function envKey(name) {
  const p = path.join(__dirname, '..', '..', 'server', '.env');
  const m = fs.readFileSync(p, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}
const KEY = envKey('OPENROUTER_API_KEY');

const PROMPT =
  'You are a tutor for a beginner student. In 2 short sentences, explain what a variable is in programming. Answer in the same language as this instruction.';

const SYS = 'Respond with the final answer only. Never include your reasoning, analysis, planning steps, or thinking process.';

async function evalModel(model) {
  const useSys = process.argv.includes('--sys');
  const messages = useSys
    ? [{ role: 'system', content: SYS }, { role: 'user', content: PROMPT }]
    : [{ role: 'user', content: PROMPT }];
  const t0 = Date.now();
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'LearnPilot',
      },
      body: JSON.stringify({ model, messages, max_tokens: 400 }),
      signal: AbortSignal.timeout(60000),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return { model, ok: false, ms, detail: `${res.status} ${(await res.text()).replace(/\s+/g, ' ').slice(0, 80)}` };
    const j = await res.json();
    const msg = j?.choices?.[0]?.message ?? {};
    const content = String(msg.content ?? '').trim();
    const reasoning = String(msg.reasoning ?? '').trim();
    return { model, ok: content.length > 0, ms, content: content.slice(0, 180), reasoning: reasoning.length };
  } catch (e) {
    return { model, ok: false, detail: e.message };
  }
}

(async () => {
  const models = process.argv.slice(2).filter((a) => !a.startsWith('--')).length
    ? process.argv.slice(2).filter((a) => !a.startsWith('--'))
    : ['nex-agi/nex-n2.5-mini:free', 'liquid/lfm-2.5-2.6b:free', 'nvidia/nemotron-3-super-120b-a12b:free'];
  // Run in parallel: sequential probing would exceed the shell's command timeout.
  const results = await Promise.all(models.map(evalModel));
  for (const r of results) {
    console.log(`\n=== ${r.model} (${r.ms}ms) ===`);
    if (!r.ok) {
      console.log(`  FAIL ${r.detail}`);
      continue;
    }
    console.log(`  content: ${r.content}`);
    console.log(`  leaked-reasoning: ${r.reasoning ? `${r.reasoning} chars (LEAKED in separate field)` : 'none'}`);
  }
})();