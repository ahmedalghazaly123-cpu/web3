// Live signup probe through the same origin the browser uses (nginx on :3000),
// then verify the created account can sign in with the same credentials.
const ORIGIN = (process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');
const API = `${ORIGIN}/api/v1`;

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }
  return { status: res.status, json, text };
}

(async () => {
  const stamp = Date.now();
  const email = `signup-probe-${stamp}@example.com`;
  const password = 'ProbePass123!';

  for (const role of ['student', 'teacher']) {
    const res = await post('/auth/signup', { email: `${role}-${email}`, password, name: `Probe ${role}`, role });
    console.log(`signup[${role}] status=${res.status} body=${res.text.slice(0, 160)}`);
    if (res.status === 201) {
      const login = await post('/auth/login', { email: `${role}-${email}`, password });
      console.log(`login [${role}] status=${login.status} role=${login.json?.user?.role}`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });