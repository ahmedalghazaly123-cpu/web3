/**
 * Push the deployment variables from server/.env to a Railway service.
 *
 * Values travel to `railway variable set` as an argv array: they never pass
 * through a shell and are never echoed, so the terminal/l로그 only shows key
 * names + value lengths (same rule as env-status.cjs / putenv-silent.cjs).
 *
 * Deployment-specific values are NOT copied from .env (a laptop's CORS_ORIGIN,
 * DATABASE_URL, localhost URLs and Ollama would break the hosted service) —
 * they are derived from the public URLs below.
 *
 * usage:
 *   node scripts/debug/railway-env-push.cjs --service backend              (dry run)
 *   node scripts/debug/railway-env-push.cjs --service backend --apply
 *   ... --no-oauth            skip the Google/GitHub OAuth client keys (they also
 *                             need a provider-console entry for the Railway callback)
 *   ... --keep-local-secrets  reuse server/.env SESSION_SECRET/COOKIE_SECRET
 *                             instead of generating fresh ones
 */
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const WEB_URL = 'https://frontend-production-a628e.up.railway.app';
const API_URL = 'https://backend-production-ea96.up.railway.app';
const ENV_NAME = process.env.RAILWAY_ENV || 'production';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const value = (f, fallback) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const service = value('--service', 'backend');
const apply = has('--apply');
const withOauth = !has('--no-oauth');
const keepLocalSecrets = has('--keep-local-secrets');

// Secrets that must never be copied verbatim: the DB URL is injected by Railway,
// the URL-ish ones come from the two constants above, and the session secrets are
// regenerated so a leaked local value cannot mint tokens on the public API.
const NEVER_COPY = new Set([
  'DATABASE_URL', 'PORT', 'NODE_ENV', 'CORS_ORIGIN', 'FRONTEND_URL', 'PUBLIC_API_URL',
  'SESSION_SECRET', 'COOKIE_SECRET', 'SESSION_COOKIE_SECURE', 'OLLAMA_ENABLED',
  'OLLAMA_BASE_URL', 'OLLAMA_MODEL', 'GOOGLE_CALLBACK_URL', 'GITHUB_CALLBACK_URL',
]);
const OAUTH_KEYS = new Set(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']);

function readEnvFile(file) {
  const map = {};
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k && v) map[k] = v;
  }
  return map;
}

const local = readEnvFile(path.join(__dirname, '..', '..', 'server', '.env'));
const toSet = {};

for (const [k, v] of Object.entries(local)) {
  if (NEVER_COPY.has(k)) continue;
  if (!withOauth && OAUTH_KEYS.has(k)) continue;
  toSet[k] = v;
}

Object.assign(toSet, {
  NODE_ENV: 'production',
  // The browser normally talks to nginx on the SPA origin (no CORS at all); the
  // list only matters for direct API calls, so it holds every public front end.
  CORS_ORIGIN: `${WEB_URL},https://web3-1-five.vercel.app,http://localhost:3000`,
  FRONTEND_URL: WEB_URL,
  PUBLIC_API_URL: API_URL,
  OLLAMA_ENABLED: 'false', // no Ollama daemon runs on Railway
  AUTH_RATE_LIMIT_MAX: '200',
});

if (withOauth) toSet.GOOGLE_CALLBACK_URL = `${API_URL}/api/v1/auth/google/callback`;
if (keepLocalSecrets) {
  if (local.SESSION_SECRET) toSet.SESSION_SECRET = local.SESSION_SECRET;
  if (local.COOKIE_SECRET) toSet.COOKIE_SECRET = local.COOKIE_SECRET;
} else {
  toSet.SESSION_SECRET = crypto.randomBytes(48).toString('base64url');
  toSet.COOKIE_SECRET = crypto.randomBytes(48).toString('base64url');
}

console.log(`service: ${service}  environment: ${ENV_NAME}  mode: ${apply ? 'APPLY' : 'dry run'}\n`);
for (const [k, v] of Object.entries(toSet).sort()) {
  const shown = /SECRET|KEY|TOKEN|PASSWORD/i.test(k) ? `<set:${v.length} chars>` : v;
  console.log(`  ${k.padEnd(24)} ${shown}`);
}

if (!apply) {
  console.log('\ndry run — add --apply to write these to Railway (this restarts the service).');
  process.exit(0);
}

const pairs = Object.entries(toSet).map(([k, v]) => `${k}=${v}`);

// On Windows the CLI is a Node shim on PATH (`railway.cmd` / an extensionless
// shell script), which execFileSync cannot start without a shell — and going
// through cmd.exe would re-parse values that contain commas or spaces. The npm
// package ships a real railway.exe, so prefer it (RAILWAY_BIN overrides).
function resolveRailwayBin() {
  if (process.env.RAILWAY_BIN) return process.env.RAILWAY_BIN;
  if (process.platform === 'win32') {
    const npmGlobal = path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@railway', 'cli', 'bin', 'railway.exe');
    if (fs.existsSync(npmGlobal)) return npmGlobal;
  }
  return 'railway';
}

try {
  const bin = resolveRailwayBin();
  execFileSync(bin, ['variable', 'set', ...pairs, '--service', service, '--environment', ENV_NAME], {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: false,
  });
  console.log(`\napplied ${pairs.length} variables to ${service} (a restart picks them up).`);
} catch (e) {
  console.error(`\nrailway variable set failed: ${e.message}`);
  process.exit(1);
}