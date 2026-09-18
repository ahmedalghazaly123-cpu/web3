// Quick live check of signup/login for all roles through the public web origin.
const origin = process.argv[2] || 'http://localhost:3000';
const base = `${origin.replace(/\/$/, '')}/api/v1/auth`;
const stamp = Date.now();
const password = 'Passw0rd123!';

async function call(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const checks = [];
async function record(label, path, body) {
  try {
    const r = await call(path, body);
    const token = r.json && (r.json.token || (r.json.user && r.json.user.token));
    const role = r.json && r.json.user && r.json.user.role;
    console.log(`${label}: ${r.status} role=${role ?? '-'} token=${token ? 'yes' : 'no'} body=${JSON.stringify(r.json).slice(0, 220)}`);
    checks.push({ label, ok: r.status >= 200 && r.status < 300 && !!token });
    return r;
  } catch (e) {
    console.log(`${label}: NETWORK ERROR ${e.message}`);
    checks.push({ label, ok: false });
    return null;
  }
}

(async () => {
  const email = (role) => `probe.${role}.${stamp}@test.com`;
  await record('signup student', '/signup', { email: email('student'), password, name: 'Probe S', role: 'student' });
  await record('login student', '/login', { email: email('student'), password });
  await record('signup teacher', '/signup', { email: email('teacher'), password, name: 'Probe T', role: 'teacher' });
  await record('login teacher', '/login', { email: email('teacher'), password });
  await record('signup admin(Ahmed)', '/signup', { email: email('admin'), password, name: 'Probe A', role: 'admin', inviteCode: 'Ahmed' });
  await record('login admin', '/login', { email: email('admin'), password, inviteCode: 'Ahmed' });
  // Reproduce the reporter's exact cases:
  await record('login social-no-password', '/login', { email: 'ahmedalghazaly38@gmail.com', password: 'Whatever123' });
  await record('signup existing-social-email', '/signup', { email: 'ahmedalghazaly38@gmail.com', password, name: 'Ahmed', role: 'student' });
  const failed = checks.filter((c) => !c.ok);
  console.log(failed.length ? `FAILED: ${failed.map((f) => f.label).join(', ')}` : 'ALL CORE CHECKS OK');
  process.exit(0);
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
