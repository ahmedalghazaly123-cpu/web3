// Live check: admin login invite-code errors map to clear UI messages.
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: 'localhost', port: 4000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const results = [];
  const bad = await post('/api/v1/auth/login', { email: 'admin@learnpilot.dev', password: 'learnpilot', inviteCode: 'WRONG-CODE' });
  results.push(['wrong code → 403 invalid-invite-code', bad.status === 403 && /invalid-invite-code/.test(bad.body)]);
  const none = await post('/api/v1/auth/login', { email: 'admin@learnpilot.dev', password: 'learnpilot' });
  results.push(['missing code → 400 invite-code-required', none.status === 400 && /invite-code-required/.test(none.body)]);
  const ok = await post('/api/v1/auth/login', { email: 'admin@learnpilot.dev', password: 'learnpilot', inviteCode: 'Ahmed' });
  let okOk = ok.status === 200;
  try { okOk = okOk && !!JSON.parse(ok.body).token; } catch { okOk = false; }
  results.push(['valid code → 200 + token', okOk]);
  let pass = 0;
  for (const [label, okFlag] of results) {
    console.log(`${okFlag ? 'PASS' : 'FAIL'} — ${label}`);
    if (okFlag) pass++;
  }
  console.log(`\n${pass}/${results.length} checks passed`);
  process.exitCode = pass === results.length ? 0 : 1;
})();
