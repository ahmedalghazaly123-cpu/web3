// helper: check the local Ollama daemon and the models it has pulled.
// usage: node scripts/debug/ollama-check.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const blobsDir = path.join(os.homedir(), '.ollama', 'models', 'blobs');

function downloadedGb() {
  if (!fs.existsSync(blobsDir)) return 0;
  let total = 0;
  for (const f of fs.readdirSync(blobsDir)) {
    try {
      total += fs.statSync(path.join(blobsDir, f)).size;
    } catch {
      /* a blob being written can be locked — skip it */
    }
  }
  return total / 1e9;
}

(async () => {
  try {
    const res = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(5000) });
    const json = await res.json().catch(() => null);
    const models = (json && json.models ? json.models : []).map((m) => `${m.name} (${(m.size / 1e9).toFixed(2)}GB)`);
    console.log(`ollama reachable: yes (${res.status})`);
    console.log(models.length ? `models: ${models.join(', ')}` : 'models: (none pulled)');
    console.log(`blobs on disk: ${downloadedGb().toFixed(2)}GB`);
  } catch (e) {
    console.log(`ollama reachable: no -> ${e.message}`);
  }
})();