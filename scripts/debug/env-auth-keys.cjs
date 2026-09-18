// Prints the auth-related server env values the live checks need.
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '..', 'server', '.env');
const out = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i <= 0 || line.trim().startsWith('#')) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (/SESSION_SECRET|FRONTEND_URL|CORS_ORIGIN|PUBLIC_API_URL|PORT|GOOGLE|GITHUB|APPLE|DATABASE_URL/.test(k)) {
      out[k] = /SECRET|DATABASE_URL|CLIENT_SECRET/.test(k) && v ? `<set:${v.length} chars>` : v;
    }
  }
}
console.log(JSON.stringify(out, null, 2));
