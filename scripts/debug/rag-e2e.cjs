const BASE = 'http://localhost:4000/api/v1';

async function main() {
  // 1. login as admin
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@learnpilot.dev', password: 'learnpilot' }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody.token;
  console.log('login:', loginRes.status, token ? 'TOKEN OK' : JSON.stringify(loginBody).slice(0, 150));
  if (!token) process.exit(1);
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. find the seeded course
  const coursesRes = await fetch(`${BASE}/courses`, { headers: auth });
  const coursesJson = await coursesRes.json();
  const list = Array.isArray(coursesJson) ? coursesJson : coursesJson.courses ?? coursesJson.data ?? [];
  const course = list.find((c) => c.id === 'seed-course-calculus-1') ?? list[0];
  console.log('course:', coursesRes.status, course ? course.id : 'NONE');
  if (!course) process.exit(1);

  // 3. index the course (RAG ingestion)
  const idxRes = await fetch(`${BASE}/rag/index`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ courseId: course.id }),
  });
  const idxBody = await idxRes.json();
  console.log('index:', idxRes.status, JSON.stringify(idxBody).slice(0, 300));
  if (!idxRes.ok) process.exit(1);

  // 4. status
  const stRes = await fetch(`${BASE}/rag/status/${course.id}`, { headers: auth });
  console.log('status:', stRes.status, await stRes.text());

  // 5. ask a grounded question
  const askRes = await fetch(`${BASE}/rag/ask`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ courseId: course.id, question: 'How do I compute the derivative of x cubed using the power rule?' }),
  });
  const askBody = await askRes.json();
  console.log('ask status:', askRes.status);
  console.log('ask answer:', (askBody.answer ?? JSON.stringify(askBody)).slice(0, 600));
  console.log('ask citations:', JSON.stringify(askBody.citations));
  console.log('ask grounded:', askBody.grounded, '| provider:', askBody.provider, '| model:', askBody.model);
}

main().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
