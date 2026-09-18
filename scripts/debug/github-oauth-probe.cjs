// Live probe: providers endpoint + GitHub OAuth start redirect.
(async () => {
  for (const base of ['http://localhost:4000/api/v1', 'http://localhost:3000/api/v1']) {
    const p = await fetch(`${base}/auth/providers`).then((r) => r.json());
    console.log(`providers via ${base}:`, JSON.stringify(p));
  }
  const res = await fetch('http://localhost:4000/api/v1/auth/github?role=student', { redirect: 'manual' });
  console.log('GET /auth/github ->', res.status, '| Location:', (res.headers.get('location') || '').slice(0, 100));
})();
