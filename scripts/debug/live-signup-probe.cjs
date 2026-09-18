// Quick live signup probe (mirrors security.test.ts signup helper).
(async () => {
  const email = `probe-signup-${Date.now()}@example.com`;
  const res = await fetch('http://localhost:4000/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'TestPass123!', name: 'Probe', role: 'student' }),
  });
  const body = await res.json();
  console.log('status:', res.status, '| has token:', !!body.token, '| error:', body.error || '-');
})();
