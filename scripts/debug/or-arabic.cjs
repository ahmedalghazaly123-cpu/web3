/**
 * Arabic capability check for OpenRouter free models (project is bilingual ar/en,
 * so a free model must answer in Arabic cleanly to be a sane default).
 * Usage: node scripts/debug/or-arabic.cjs [model ...]
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

const PROMPT = 'اشرح في جملتين قصيرتين لطالب مبتدئ إيه هو المتغير في البرمجة. أجب بالعربية.';

async function check(model) {
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
      body: JSON.stringify({ model, messages: [{ role: 'user', content: PROMPT }], max_tokens: 200 }),
      signal: AbortSignal.timeout(45000),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return `${model} :: FAIL ${res.status} (${ms}ms)`;
    const j = await res.json();
    const content = String(j?.choices?.[0]?.message?.content ?? '').trim();
    const arabic = (content.match(/[\u0600-\u06FF]/g) || []).length;
    const verdict = content.length === 0 ? 'EMPTY' : arabic > 20 ? 'ARABIC-OK' : 'NOT-ARABIC';
    return `${model} :: ${verdict} (${ms}ms) :: ${content.replace(/\s+/g, ' ').slice(0, 110)}`;
  } catch (e) {
    return `${model} :: FAIL ${e.message}`;
  }
}

(async () => {
  const models = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ['nex-agi/nex-n2.5-mini:free', 'cohere/north-mini-code:free', 'dots-studio/dots-3-note-preview:free'];
  for (const m of models) console.log(await check(m));
})();