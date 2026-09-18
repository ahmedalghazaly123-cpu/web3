// Quick diagnostic: does each seeded role get its real role back from the API?
const API = process.env.API_URL || 'http://localhost:4000';
const PASSWORD = process.env.SEED_PASSWORD || 'learnpilot';
const roles = ['student', 'teacher', 'admin', 'owner'];

(async () => {
  for (const role of roles) {
    const email = `${role}@learnpilot.dev`;
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.log(`${role.padEnd(8)} HTTP ${res.status} ${JSON.stringify(json)}`);
      continue;
    }
    const me = await fetch(`${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${json.token}` },
    });
    const meJson = await me.json().catch(() => ({}));
    console.log(
      `${role.padEnd(8)} login.user.role=${json.user?.role}  /me.role=${meJson.user?.role}  expected=${role.toUpperCase()}`,
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});