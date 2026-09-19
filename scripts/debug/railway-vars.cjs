// Which environment variables does a deployed service actually have?
// Prints variable *names* plus a whitelist of non-secret values — secrets are
// never echoed (only `<set>` / `<missing>`).
// usage:
//   railway variables --service backend --json > %TEMP%\backend-vars.json
//   node scripts/debug/railway-vars.cjs %TEMP%\backend-vars.json
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/debug/railway-vars.cjs <vars.json>');
  process.exit(2);
}

const SHOW = [
  'NODE_ENV', 'PORT', 'CORS_ORIGIN', 'FRONTEND_URL', 'PUBLIC_API_URL',
  'GOOGLE_CALLBACK_URL', 'GITHUB_CALLBACK_URL', 'VITE_API_URL', 'BACKEND_URL',
  'OLLAMA_ENABLED', 'OLLAMA_BASE_URL', 'OLLAMA_MODEL', 'AUTH_RATE_LIMIT_MAX',
  'RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_SERVICE_NAME', 'RAILWAY_ENVIRONMENT_NAME',
];
const SECRETISH = /SECRET|KEY|TOKEN|PASSWORD|DATABASE_URL|CLIENT_ID/i;

const raw = fs.readFileSync(file, 'utf8');
let vars;
try {
  vars = JSON.parse(raw);
} catch {
  console.error('could not parse the dump — run the railway command first.\n');
  console.error(raw.slice(0, 500));
  process.exit(1);
}

const names = Object.keys(vars).sort();
console.log(`variables found: ${names.length}\n`);
for (const name of SHOW) {
  const present = name in vars;
  const value = present ? (SECRETISH.test(name) ? `<set:${String(vars[name]).length} chars>` : vars[name]) : '<missing>';
  console.log(`${present ? ' ' : '-'} ${name.padEnd(26)} ${value}`);
}
console.log(`\nall names:\n${names.join(', ')}`);