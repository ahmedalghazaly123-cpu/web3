// Waits until the Docker engine answers `docker info`, then reports the version.
// Avoids cmd quoting problems when polling from scripts.
const { execSync } = require('child_process');

const timeoutMs = Number(process.argv[2] || 180000);
const startedAt = Date.now();

function probe() {
  try {
    const out = execSync('docker info --format "{{.ServerVersion}}"', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15000,
    }).trim();
    return out ? { ok: true, version: out } : { ok: false, reason: 'empty' };
  } catch (e) {
    return { ok: false, reason: 'not-ready' };
  }
}

(async () => {
  for (;;) {
    const res = probe();
    if (res.ok) {
      console.log(`DOCKER_READY server=${res.version} after=${Math.round((Date.now() - startedAt) / 1000)}s`);
      process.exit(0);
    }
    if (Date.now() - startedAt > timeoutMs) {
      console.log(`DOCKER_TIMEOUT after=${Math.round((Date.now() - startedAt) / 1000)}s`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 4000));
    process.stdout.write('.');
  }
})();