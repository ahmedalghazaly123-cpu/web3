// Live smoke test for the API running in Docker (http://localhost:4000).
// Covers: health, auth, the new sandbox/voice/collab routes, and ownership guards.
// usage: node scripts/debug/live-check.cjs
const BASE = process.env.LIVE_BASE || 'http://localhost:4000';

let pass = 0;
let fail = 0;

function record(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ::  ' + detail : ''}`);
  ok ? pass++ : fail++;
}

async function call(method, path, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json (audio/health text) */
  }
  return { status: res.status, json, text, raw: raw ? res : undefined };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
  } catch (e) {
    record(name, false, e.message);
  }
}

function expect(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label || 'status'}: expected ${expected}, got ${actual}`);
}

(async () => {
  console.log(`base: ${BASE}\n`);

  // --- 1. unauthenticated surface ---
  await step('GET /health', async () => {
    const r = await call('GET', '/health');
    expect(r.status, 200);
    return `200 ${r.text.slice(0, 60)}`;
  });
  await step('GET /ready', async () => {
    const r = await call('GET', '/ready');
    expect(r.status, 200);
    return `200 ${r.text.slice(0, 60)}`;
  });
  await step('GET /api/v1/sandbox/runs without token -> 401', async () => {
    const r = await call('GET', '/api/v1/sandbox/runs');
    expect(r.status, 401);
    return '401';
  });

  // --- 2. auth ---
  const students = await call('POST', '/api/v1/auth/login', {
    body: { email: 'student@learnpilot.dev', password: 'learnpilot' },
  });
  if (students.status !== 200) {
    record('POST /api/v1/auth/login (student)', false, `HTTP ${students.status} ${students.text.slice(0, 120)}`);
    console.log('\nSeed data missing — run: node scripts/debug/run-prisma.cjs db:seed');
    process.exit(1);
  }
  const student = students.json.token;
  record('POST /api/v1/auth/login (student)', true, `role=${students.json.user.role}`);

  const teachers = await call('POST', '/api/v1/auth/login', {
    body: { email: 'teacher@learnpilot.dev', password: 'learnpilot' },
  });
  expect(teachers.status, 200);
  const teacher = teachers.json.token;
  record('POST /api/v1/auth/login (teacher)', true, `role=${teachers.json.user.role}`);

  await step('GET /api/v1/ai/status', async () => {
    const r = await call('GET', '/api/v1/ai/status', { token: student });
    expect(r.status, 200);
    const j = r.json || {};
    const chain = (j.chain || []).map((c) => `${c.name}(${(c.models || []).join('|')})`).join(' -> ');
    const ollama = j.ollama || {};
    return `chain=[${chain}] ollama(enabled=${ollama.enabled},reachable=${ollama.reachable},models=[${(ollama.models || []).join(',')}]) fallback=${j.fallback}`;
  });

  await step('POST /api/v1/ai/generate (english)', async () => {
    const r = await call('POST', '/api/v1/ai/generate', {
      token: student,
      body: { mode: 'explain', prompt: 'What is a derivative?', language: 'en' },
    });
    if (r.status !== 200) throw new Error(`HTTP ${r.status} ${r.text.slice(0, 120)}`);
    const j = r.json;
    if (!j.text && !j.content) throw new Error('empty AI response');
    return `provider=${j.provider} model=${j.model} cache=${j.usedCache} ${j.latencyMs}ms "${String(j.content || j.text).slice(0, 70)}…"`;
  });

  await step('POST /api/v1/ai/generate (arabic)', async () => {
    const r = await call('POST', '/api/v1/ai/generate', {
      token: student,
      body: { mode: 'explain', prompt: 'اشرح المشتقة في جملة واحدة', language: 'ar' },
    });
    if (r.status !== 200) throw new Error(`HTTP ${r.status} ${r.text.slice(0, 120)}`);
    const j = r.json;
    if (!j.text && !j.content) throw new Error('empty AI response');
    return `provider=${j.provider} model=${j.model} "${String(j.content || j.text).slice(0, 60)}…"`;
  });

  // --- 3. sandbox ---
  let runId = null;
  await step('POST /api/v1/sandbox/validate', async () => {
    const r = await call('POST', '/api/v1/sandbox/validate', {
      token: student,
      body: { language: 'js', code: 'console.log(1)' },
    });
    expect(r.status, 200);
    if (!r.json.allowed) throw new Error('expected allowed');
    return 'allowed';
  });
  await step('POST /api/v1/sandbox/run (js)', async () => {
    const r = await call('POST', '/api/v1/sandbox/run', {
      token: student,
      body: { language: 'js', code: "console.log('lp-' + (6 * 7));" },
    });
    expect(r.status, 201);
    runId = r.json.run.id;
    const out = (r.json.run.stdout || []).join('');
    if (!out.includes('lp-42')) throw new Error(`stdout=${JSON.stringify(r.json.run.stdout)} status=${r.json.run.status}`);
    return `status=${r.json.run.status} stdout="${out.trim()}" ${r.json.run.durationMs}ms`;
  });
  await step('POST /api/v1/sandbox/run rejects process access', async () => {
    const r = await call('POST', '/api/v1/sandbox/run', {
      token: student,
      body: { language: 'js', code: 'process.exit(1)' },
    });
    expect(r.status, 201);
    if (r.json.run.accepted) throw new Error('dangerous code was accepted');
    return `blocked: ${String(r.json.run.reason).slice(0, 60)}`;
  });
  await step('GET /api/v1/sandbox/runs (own history)', async () => {
    const r = await call('GET', '/api/v1/sandbox/runs?limit=5', { token: student });
    expect(r.status, 200);
    if (!Array.isArray(r.json.runs) || r.json.runs.length === 0) throw new Error('no runs returned');
    return `${r.json.runs.length} run(s)`;
  });
  await step('GET /api/v1/sandbox/runs/:id (owner)', async () => {
    const r = await call('GET', `/api/v1/sandbox/runs/${runId}`, { token: student });
    expect(r.status, 200);
    return r.json.run.status;
  });
  await step('GET /api/v1/sandbox/runs/:id (other user) -> 403', async () => {
    const r = await call('GET', `/api/v1/sandbox/runs/${runId}`, { token: teacher });
    expect(r.status, 403);
    return '403 (ownership enforced)';
  });

  // --- 4. voice ---
  let voiceId = null;
  await step('POST /api/v1/voice/sessions', async () => {
    const r = await call('POST', '/api/v1/voice/sessions', { token: student, body: { language: 'en' } });
    expect(r.status, 201);
    voiceId = r.json.session.id;
    return `id=${voiceId} language=${r.json.session.language}`;
  });
  await step('POST /api/v1/voice/sessions/:id/transcript', async () => {
    const r = await call('POST', `/api/v1/voice/sessions/${voiceId}/transcript`, {
      token: student,
      body: { text: 'Explain the power rule for derivatives.', lang: 'en' },
    });
    expect(r.status, 200);
    return 'appended';
  });
  await step('POST /api/v1/voice/sessions/:id/transcript (other user) -> 403', async () => {
    const r = await call('POST', `/api/v1/voice/sessions/${voiceId}/transcript`, {
      token: teacher,
      body: { text: 'hijack', lang: 'en' },
    });
    expect(r.status, 403);
    return '403 (IDOR fixed)';
  });
  await step('POST /api/v1/voice/sessions/:id/answer', async () => {
    const r = await call('POST', `/api/v1/voice/sessions/${voiceId}/answer`, {
      token: student,
      body: { content: 'The power rule: d/dx x^n = n*x^(n-1).', latencyMs: 320 },
    });
    expect(r.status, 200);
    return 'persisted';
  });
  await step('GET /api/v1/voice/summary/:id', async () => {
    const r = await call('GET', `/api/v1/voice/summary/${voiceId}`, { token: student });
    expect(r.status, 200);
    return `summary keys=${Object.keys(r.json.summary || {}).join(',')}`;
  });
  await step('POST /api/v1/voice/sessions/:id/close', async () => {
    const r = await call('POST', `/api/v1/voice/sessions/${voiceId}/close`, {
      token: student,
      body: { summary: 'live check' },
    });
    expect(r.status, 200);
    return `status=${r.json.session.status}`;
  });
  await step('GET /api/v1/voice/sessions (own history)', async () => {
    const r = await call('GET', '/api/v1/voice/sessions?limit=5', { token: student });
    expect(r.status, 200);
    if (!Array.isArray(r.json.sessions)) throw new Error('bad payload');
    return `${r.json.sessions.length} session(s)`;
  });
  await step('POST /api/v1/voice/synthesize -> 200 or 503', async () => {
    const r = await call('POST', '/api/v1/voice/synthesize', { token: student, body: { text: 'hello', lang: 'en' } });
    if (r.status !== 200 && r.status !== 503) throw new Error(`unexpected ${r.status}`);
    return r.status === 503 ? '503 provider-unavailable (graceful fallback)' : '200 audio';
  });
  await step('POST /api/v1/voice/transcribe without file -> 400', async () => {
    const r = await call('POST', '/api/v1/voice/transcribe', { token: student, body: {} });
    if (r.status !== 400 && r.status !== 415) throw new Error(`unexpected ${r.status}`);
    return `${r.status}`;
  });

  // --- 5. collab rooms ---
  let roomId = null;
  let roomCode = null;
  let teacherUserId = null;
  await step('POST /api/v1/collab/rooms (student hosts)', async () => {
    const r = await call('POST', '/api/v1/collab/rooms', {
      token: student,
      body: { kind: 'quiz-battle', title: 'Live check room', privacy: 'invite-only', language: 'en' },
    });
    expect(r.status, 201);
    roomId = r.json.room.id;
    roomCode = r.json.room.settings && r.json.room.settings.code;
    if (!roomCode) throw new Error('room code missing');
    return `id=${roomId} code=${roomCode} members=${r.json.room.members.length}`;
  });
  await step('POST /api/v1/collab/rooms/:id/join wrong code -> 409', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/join`, {
      token: teacher,
      body: { code: 'WRONG1', name: 'Sara' },
    });
    expect(r.status, 409);
    return '409 invalid-code';
  });
  await step('POST /api/v1/collab/rooms/:id/join with code', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/join`, {
      token: teacher,
      body: { code: roomCode, name: 'Sara' },
    });
    expect(r.status, 200);
    const me = r.json.room.members.find((m) => m.role === 'participant');
    teacherUserId = me ? me.userId : null;
    if (!teacherUserId) throw new Error('joined member not found');
    return `members=${r.json.room.members.length} role=${me.role}`;
  });
  await step('POST /api/v1/collab/rooms/:id/start (non-host) -> 403', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/start`, { token: teacher });
    expect(r.status, 403);
    return '403 host-only';
  });
  await step('POST /api/v1/collab/rooms/:id/start (host)', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/start`, { token: student });
    expect(r.status, 200);
    return `status=${r.json.room.status}`;
  });
  await step('POST /api/v1/collab/rooms/:id/messages', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/messages`, {
      token: teacher,
      body: { content: 'ready when you are', kind: 'CHAT' },
    });
    expect(r.status, 201);
    return 'message created';
  });
  await step('POST /api/v1/collab/rooms/:id/award (server-side scoring)', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/award`, {
      token: student,
      body: { userId: teacherUserId, points: 25 },
    });
    expect(r.status, 200);
    expect(r.json.membership.score, 25, 'score');
    return 'score=25';
  });
  await step('GET /api/v1/collab/rooms/:id/messages', async () => {
    const r = await call('GET', `/api/v1/collab/rooms/${roomId}/messages`, { token: teacher });
    expect(r.status, 200);
    const kinds = r.json.messages.map((m) => m.kind).join(',');
    return `${r.json.messages.length} message(s): ${kinds}`;
  });
  await step('POST /api/v1/collab/rooms/:id/finish (host)', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/finish`, { token: student });
    expect(r.status, 200);
    if (!r.json.leaderboard.length) throw new Error('empty leaderboard');
    return `winner=${r.json.winner} leaderboard=${r.json.leaderboard.length}`;
  });
  await step('POST /api/v1/collab/rooms/:id/join after finish -> 409', async () => {
    const r = await call('POST', `/api/v1/collab/rooms/${roomId}/join`, { token: teacher, body: {} });
    expect(r.status, 409);
    return '409 room-closed';
  });
  await step('GET /api/v1/collab/rooms (list)', async () => {
    const r = await call('GET', '/api/v1/collab/rooms?limit=5', { token: student });
    expect(r.status, 200);
    return `${r.json.rooms.length} room(s)`;
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('live-check crashed:', e);
  process.exit(1);
});
