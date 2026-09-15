// Preflight for the Playwright E2E run: is the web app up, is the API up, and
// are the Chromium browsers downloaded?
// usage: node scripts/debug/e2e-preflight.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');

const WEB = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000/api/v1';

async function probe(label, url, init) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    console.log(`${label.padEnd(22)} ${res.status}  ${body.slice(0, 90).replace(/\s+/g, ' ')}`);
    return res;
  } catch (e) {
    console.log(`${label.padEnd(22)} UNREACHABLE  ${e.message}`);
    return null;
  }
}

(async () => {
  await probe('web (/)', WEB + '/');
  await probe('api (/health)', 'http://localhost:4000/health');

  const signup = await probe('api (signup probe)', `${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `preflight-${Date.now()}@example.com`,
      password: 'TestPass123!',
      name: 'Preflight',
      role: 'student',
    }),
  });
  if (signup && signup.status !== 201 && signup.status !== 200) {
    console.log('  -> signup is required by the E2E specs; a non-2xx here fails every test.');
  }

  const dir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
  if (!fs.existsSync(dir)) {
    console.log(`browsers               NOT INSTALLED (${dir}) -> run: npx playwright install chromium`);
  } else {
    const list = fs.readdirSync(dir);
    const chromium = list.filter((d) => d.startsWith('chromium'));
    console.log(`browsers               ${list.length} dir(s), chromium: ${chromium.join(', ') || 'NONE'}`);
    if (!chromium.length) console.log('  -> run: npx playwright install chromium');
  }
})();