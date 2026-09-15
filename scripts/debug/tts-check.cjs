// helper: probe Groq's /audio/speech endpoint for the working TTS model + voice
// per language, so the env defaults can be pinned to something that really works.
// usage: node scripts/debug/tts-check.cjs
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const envFile = path.join(root, 'server', '.env');

function loadKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  if (!fs.existsSync(envFile)) return '';
  const line = fs
    .readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .find((l) => /^GROQ_API_KEY\s*=/.test(l.trim()));
  return line ? line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : '';
}

const KEY = loadKey();

const CANDIDATES = [
  { lang: 'en', model: 'canopylabs/orpheus-v1-english', voices: ['hannah', 'troy', 'austin', 'autumn', 'diana', 'daniel'] },
  { lang: 'ar', model: 'canopylabs/orpheus-arabic-saudi', voices: ['layla', 'fatima', 'maryam', 'nora', 'sara', 'hannah', 'troy'] },
];

async function tryVoice(model, voice, text) {
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text, voice, response_format: 'wav' }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, detail: `${res.status} ${body.replace(/\s+/g, ' ').slice(0, 110)}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: buf.length > 0, detail: `${buf.length} bytes wav` };
}

(async () => {
  if (!KEY) {
    console.log('GROQ_API_KEY not found (server/.env) — skipping TTS probe');
    process.exit(0);
  }
  for (const c of CANDIDATES) {
    console.log(`\n=== ${c.lang} :: ${c.model} ===`);
    for (const voice of c.voices) {
      const text = c.lang === 'ar' ? 'مرحبا بك في ليرن بايلوت.' : 'Welcome to LearnPilot.';
      try {
        const r = await tryVoice(c.model, voice, text);
        console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${voice}  ::  ${r.detail}`);
      } catch (e) {
        console.log(`FAIL ${voice}  ::  ${e.message}`);
      }
    }
  }
})();