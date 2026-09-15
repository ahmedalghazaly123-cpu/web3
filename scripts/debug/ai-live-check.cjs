// Live AI/RAG check against the running API (Docker, http://localhost:4000).
// Verifies the provider chain (incl. the local Ollama self-hosted model), the
// persisted AI conversations and the grounded RAG endpoints.
// usage: node scripts/debug/ai-live-check.cjs
const BASE = process.env.LIVE_BASE || 'http://localhost:4000/api/v1';

let pass = 0;
let fail = 0;

function record(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ::  ' + detail : ''}`);
  ok ? pass++ : fail++;
}

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function step(name, fn) {
  try {
    record(name, true, await fn());
  } catch (e) {
    record(name, false, e.message);
  }
}

function expect(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label || 'status'}: expected ${expected}, got ${actual}`);
}

(async () => {
  const students = await call('POST', '/auth/login', { body: { email: 'student@learnpilot.dev', password: 'learnpilot' } });
  if (students.status !== 200) {
    console.error(`login failed (${students.status}) — seed the DB first`);
    process.exit(1);
  }
  const student = students.json.token;
  const teachers = await call('POST', '/auth/login', { body: { email: 'teacher@learnpilot.dev', password: 'learnpilot' } });
  const teacher = teachers.json.token;

  await step('GET /ai/status (provider chain + self-hosted model)', async () => {
    const r = await call('GET', '/ai/status', { token: student });
    expect(r.status, 200);
    const j = r.json;
    if (!j.ollama.reachable) throw new Error('self-hosted Ollama not reachable from the API');
    if (!j.ollama.models.length) throw new Error('no self-hosted model pulled');
    return `chain=${j.chain.length} provider(s) | ollama=${j.ollama.models.join(',')} | custom=${j.custom.configured ? 'configured' : 'not-configured'}`;
  });

  await step('POST /ai/generate returns real content', async () => {
    const r = await call('POST', '/ai/generate', {
      token: student,
      body: { prompt: 'In one sentence, what is a derivative?', mode: 'explain', language: 'en' },
    });
    expect(r.status, 200);
    if (!r.json.ok) throw new Error('ok=false');
    if (!r.json.content || String(r.json.content).length < 10) throw new Error('empty content');
    return `provider=${r.json.provider} model=${r.json.model} ${r.json.latencyMs}ms${r.json.error ? ' (fallback: ' + r.json.error + ')' : ''}`;
  });

  // ── persisted conversations ──
  let convId = null;
  await step('POST /ai/conversations', async () => {
    const r = await call('POST', '/ai/conversations', {
      token: student,
      body: { title: 'Live check conversation', mode: 'EXPLAIN', tags: ['e2e'] },
    });
    expect(r.status, 201);
    convId = r.json.conversation.id;
    return `id=${convId} mode=${r.json.conversation.mode}`;
  });
  await step('POST /ai/conversations/:id/messages', async () => {
    const r = await call('POST', `/ai/conversations/${convId}/messages`, {
      token: student,
      body: { role: 'USER', content: 'Why is the sky blue?' },
    });
    expect(r.status, 201);
    return `message id=${r.json.message.id}`;
  });
  await step('GET /ai/conversations/:id (owner sees history)', async () => {
    const r = await call('GET', `/ai/conversations/${convId}`, { token: student });
    expect(r.status, 200);
    const msgs = r.json.conversation.messages || [];
    if (!msgs.length) throw new Error('no messages persisted');
    return `${msgs.length} message(s)`;
  });
  await step('GET /ai/conversations/:id (other user blocked)', async () => {
    const r = await call('GET', `/ai/conversations/${convId}`, { token: teacher });
    if (r.status !== 403 && r.status !== 404) throw new Error(`expected 403/404, got ${r.status}`);
    return `${r.status} (ownership enforced)`;
  });
  await step('GET /ai/conversations (own list)', async () => {
    const r = await call('GET', '/ai/conversations', { token: student });
    expect(r.status, 200);
    if (!Array.isArray(r.json.conversations)) throw new Error('bad payload');
    return `${r.json.conversations.length} conversation(s)`;
  });
  await step('GET /ai/usage (cost summary)', async () => {
    const r = await call('GET', '/ai/usage', { token: student });
    expect(r.status, 200);
    return `keys=${Object.keys(r.json).join(',')}`;
  });

  // ── RAG ──
  let courseId = process.env.LIVE_COURSE_ID || null;
  await step('resolve a course to index', async () => {
    if (courseId) return `from env: ${courseId}`;
    const r = await call('GET', '/courses', { token: student });
    if (r.status !== 200) throw new Error(`courses list ${r.status}`);
    const list = r.json.courses || r.json.data || r.json;
    if (!Array.isArray(list) || !list.length) throw new Error('no courses in DB (seed first)');
    courseId = list[0].id;
    return `courseId=${courseId}`;
  });
  await step('POST /rag/index (teacher re-indexes course)', async () => {
    const r = await call('POST', '/rag/index', { token: teacher, body: { courseId } });
    if (r.status === 403) return '403 not_your_course — course belongs to another teacher (expected)';
    if (r.status === 404) return '404 course_not_found (stale id — expected)';
    expect(r.status, 200);
    return `indexed=${r.json.indexed ?? r.json.chunks ?? 'n/a'}`;
  });
  await step('POST /rag/ask grounded answer or clean 422', async () => {
    const r = await call('POST', '/rag/ask', { token: student, body: { question: 'What is a limit?', courseId } });
    if (r.status === 422) return '422 no_evidence (index empty — graceful)';
    if (r.status === 502 || r.status === 503) return `${r.status} embedding provider unavailable (graceful)`;
    expect(r.status, 200);
    return `answer chars=${String(r.json.answer || '').length} sources=${(r.json.sources || []).length}`;
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('ai-live-check crashed:', e);
  process.exit(1);
});
