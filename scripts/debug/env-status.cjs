// helper: show which env keys are SET (with length) or EMPTY — never values.
// usage: node scripts/debug/env-status.cjs [envFile]
const fs = require('fs');
const path = require('path');

const envFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'server', '.env');

const KEYS = [
  'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY', 'MISTRAL_API_KEY',
  'DEEPINFRA_API_KEY', 'HUGGINGFACE_API_KEY', 'GITHUB_TOKEN', 'GOOGLE_AI_API_KEY',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OLLAMA_ENABLED',
];
const map = {};
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) map[m[1]] = m[2];
}
for (const k of KEYS) {
  const v = (map[k] || '').trim();
  console.log(`${k}: ${v ? `SET (len=${v.length})` : 'EMPTY'}`);
}
