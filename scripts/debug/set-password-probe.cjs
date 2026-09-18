// One-off probe: does POST /auth/set-password exist on both the API port and
// through the nginx proxy, and what does each return for an unknown token?
(async () => {
  const body = JSON.stringify({ token: 'not-a-real-token', password: 'ProbePass123' });
  for (const url of [
    'http://localhost:4000/api/v1/auth/set-password',
    'http://localhost:3000/api/v1/auth/set-password',
  ]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      console.log(`${url} -> ${res.status} ${(await res.text()).slice(0, 120)}`);
    } catch (e) {
      console.log(`${url} -> ERROR ${e.message}`);
    }
  }
})();