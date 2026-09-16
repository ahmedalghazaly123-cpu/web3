// Token gate: the ONLY public surface of the Space. Ollama listens on
// 127.0.0.1:11434 inside the container; this gate listens on :7860 (HF)
// and forwards ONLY requests carrying the right Bearer token.
// Endpoints exposed (OpenAI-compatible, what our `custom` slot calls):
//   GET  /v1/models
//   POST /v1/chat/completions
//   GET  /health            (no token — for HF / wake pings)
'use strict';
const http = require('http');

const TOKEN = process.env.GATE_TOKEN || '';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const PORT = Number(process.env.GATE_PORT || 7860);
const OLLAMA = 'http://127.0.0.1:11434';

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, model: MODEL });
  }

  // ── auth: everything else needs the token ──
  const auth = req.headers.authorization || '';
  if (!TOKEN || auth !== `Bearer ${TOKEN}`) {
    return send(res, 401, { error: 'unauthorized' });
  }

  try {
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      const r = await fetch(`${OLLAMA}/api/tags`);
      const j = await r.json().catch(() => ({ models: [] }));
      const data = (j.models || []).map((m) => ({ id: m.name, object: 'model' }));
      return send(res, 200, { object: 'list', data });
    }

    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      const r = await fetch(`${OLLAMA}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: body.model || MODEL,
          messages: body.messages || [],
          stream: false,
          options: { num_ctx: 4096 },
        }),
      });
      const j = await r.json().catch(() => ({}));
      const content = (j.message && j.message.content) || '';
      return send(res, r.ok ? 200 : 502, {
        id: `hf-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model || MODEL,
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: j.prompt_eval_count || 0,
          completion_tokens: j.eval_count || 0,
          total_tokens: (j.prompt_eval_count || 0) + (j.eval_count || 0),
        },
      });
    }

    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 502, { error: 'upstream failed' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`gate up :${PORT} model=${MODEL}`));
