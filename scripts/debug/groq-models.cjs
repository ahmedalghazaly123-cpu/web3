/**
 * List the Groq models that matter for the voice pipeline (TTS / STT / chat),
 * so we can pick real model ids instead of guessing after a deprecation.
 * Usage: node scripts/debug/groq-models.cjs [tts|stt|chat|all]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const filter = (process.argv[2] || 'tts').toLowerCase();

function envKey(name) {
  const p = path.join(__dirname, '..', '..', 'server', '.env');
  const m = fs.readFileSync(p, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

(async () => {
  const key = envKey('GROQ_API_KEY');
  if (!key) {
    console.log('GROQ_API_KEY not set in server/.env');
    process.exit(1);
  }
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    console.log('models request failed:', res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const ids = ((await res.json()).data || []).map((m) => m.id).sort();
  const groups = {
    tts: /tts|speech|orpheus|playai|canopylabs/i,
    stt: /whisper/i,
    chat: /llama|qwen|gpt-oss|mixtral|gemma|deepseek/i,
  };
  const re = groups[filter] || /./;
  console.log(`groq models matching "${filter}": ${ids.length} total / ${ids.filter((i) => re.test(i)).length} shown`);
  ids.filter((i) => re.test(i)).forEach((i) => console.log('  ' + i));
})();
