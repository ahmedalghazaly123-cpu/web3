import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { auditLogService, aiService } from '../services/index.js';
import { AiMode, MessageRole, UsageStatus } from '@prisma/client';

const router = Router();

const aiRequestSchema = z.object({
  prompt: z.string().min(1),
  mode: z.enum(['explain', 'hint', 'socratic', 'step-by-step', 'exam-prep', 'revision', 'error-explanation', 'full-solution', 'guided-solution', 'assist']),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  studentId: z.string().optional(),
  language: z.enum(['en', 'ar']).optional(),
});

const PROVIDER_MODEL_CANDIDATES: Array<{ name: string; baseUrl: string; apiKey: string; models: string[]; extraHeaders?: Record<string, string> }> = [];
// All providers here are free / no card, tried in order:
// Groq -> OpenRouter -> Mistral -> DeepInfra -> HuggingFace -> GitHub Models -> Google Gemini -> local Ollama.
// Cerebras is registered too but sits after OpenRouter: its key connects (200 on /models)
// yet chat returns 402 (needs billing/quota), so it only acts as backup when quota exists.
// Each provider tries its own model list automatically: if one model 404s/402s/429s,
// the next model on the SAME provider is tried before moving to the next provider.
// ── 0) Self-hosted powerful model (your own GPU server) — highest priority ──
// Use this when you rent a GPU server (RunPod / Vast.ai / your own VPS with GPU)
// and expose an OpenAI-compatible endpoint (vLLM, TGI, Ollama, LM Studio...).
// Example: CUSTOM_LLM_BASE_URL=https://xxxx-8000.proxy.runpod.net/v1
//          CUSTOM_LLM_MODEL=qwen2.5:32b   (or llama-3.3-70b, allam-2-13b, jais-30b...)
//          CUSTOM_LLM_API_KEY=any-string-if-no-auth
// ── 0b) Second self-hosted endpoint — used for the two-space HF plan ──
// Space-1 (qwen2.5:7b) goes in CUSTOM_LLM_* above (priority #1), Space-2
// (qwen3:8b) goes here (priority #2). Each Space carries ONE model with its
// own token gate. If Space-1 sleeps/fails the cascade falls through here.
// Example: CUSTOM_LLM_2_BASE_URL=https://user2-qwen3-8b.hf.space/v1
//          CUSTOM_LLM_2_MODEL=qwen3:8b
//          CUSTOM_LLM_2_API_KEY=<token-for-space-2>
if (process.env.CUSTOM_LLM_BASE_URL) {
  const customModels = (process.env.CUSTOM_LLM_MODEL || 'qwen2.5:32b')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  PROVIDER_MODEL_CANDIDATES.push({ name: 'custom', baseUrl: process.env.CUSTOM_LLM_BASE_URL, apiKey: process.env.CUSTOM_LLM_API_KEY || 'local', models: customModels });
}
if (process.env.CUSTOM_LLM_2_BASE_URL) {
  const custom2Models = (process.env.CUSTOM_LLM_2_MODEL || 'qwen3:8b')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  PROVIDER_MODEL_CANDIDATES.push({ name: 'custom-2', baseUrl: process.env.CUSTOM_LLM_2_BASE_URL, apiKey: process.env.CUSTOM_LLM_2_API_KEY || 'local', models: custom2Models });
}
if (process.env.GROQ_API_KEY) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY, models: [process.env.GROQ_MODEL || 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] });
}
if (process.env.OPENROUTER_API_KEY) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY, models: [process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-2.6b:free', 'google/gemma-4-26b-a4b-it:free', 'nvidia/nemotron-3.5-lightning:free', 'cohere/north-mini-code:free', 'nvidia/nemotron-3-ultra-550b-a55b:free'], extraHeaders: { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'LearnPilot' } });
}
if (process.env.CEREBRAS_API_KEY) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'cerebras', baseUrl: 'https://api.cerebras.ai/v1', apiKey: process.env.CEREBRAS_API_KEY, models: [process.env.CEREBRAS_MODEL || 'qwen-3.8-27b', 'gpt-oss-120b'] });
}
if (process.env.MISTRAL_API_KEY) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'mistral', baseUrl: 'https://api.mistral.ai/v1', apiKey: process.env.MISTRAL_API_KEY, models: [process.env.MISTRAL_MODEL || 'mistral-small-latest', 'mistral-small-2503', 'mistral-large-2411'] });
}
if (process.env.DEEPINFRA_API_KEY) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'deepinfra', baseUrl: 'https://api.deepinfra.com/v1/openai', apiKey: process.env.DEEPINFRA_API_KEY, models: [process.env.DEEPINFRA_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct', 'meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-7B-Instruct'] });
}
if (process.env.HUGGINGFACE_API_KEY) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'huggingface', baseUrl: 'https://router.huggingface.co/v1', apiKey: process.env.HUGGINGFACE_API_KEY, models: [process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct', 'Qwen/Qwen2.5-7B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3'] });
}
if (process.env.GITHUB_TOKEN) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'github-models', baseUrl: 'https://models.github.ai/inference', apiKey: process.env.GITHUB_TOKEN, models: [process.env.GITHUB_MODEL || 'openai/gpt-4o-mini', 'Meta/Llama-3.1-8B-Instruct', 'mistral-ai/Ministral-3B'] });
}
if (process.env.GOOGLE_AI_API_KEY) {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: process.env.GOOGLE_AI_API_KEY, models: [process.env.GOOGLE_AI_MODEL || 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'] });
}
// Local Ollama is a free, unlimited fallback (no tokens, runs on your machine).
// Disable it with OLLAMA_ENABLED=false if you don't run Ollama.
if (process.env.OLLAMA_ENABLED !== 'false') {
  PROVIDER_MODEL_CANDIDATES.push({ name: 'ollama', baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434', apiKey: 'local', models: [process.env.OLLAMA_MODEL || 'llama3'] });
}
const PROVIDERS = PROVIDER_MODEL_CANDIDATES.map((p) => ({ name: p.name, baseUrl: p.baseUrl, apiKey: p.apiKey, model: p.models[0], extraHeaders: p.extraHeaders }));
function candidateFor(providerName: string): { name: string; baseUrl: string; apiKey: string; models: string[]; extraHeaders?: Record<string, string> } | undefined {
  return PROVIDER_MODEL_CANDIDATES.find((p) => p.name === providerName);
}

// In-memory response cache: identical requests are served from here so the
// paid/free quota is only spent once per unique prompt. Keeps the AI "alive"
// all day instead of burning tokens on repeats.
const AI_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_CACHE_MAX = 300;
const aiCache = new Map<string, { content: string; model: string; provider: string; at: number }>();

function cacheKey(prompt: string, mode: string, language: string): string {
  return `${mode}::${language}::${prompt.trim().toLowerCase().slice(0, 500)}`;
}

type DemoResponses = Record<string, Record<'en' | 'ar', string>>;

const DEMO_RESPONSES: DemoResponses = {
  explain: {
    en: 'Here is a clear explanation of the concept. Let me break it down step by step so you can understand the key ideas.',
    ar: 'هذا شرح واضح للمفهوم. دعوني أقسمه إلى خطوات حتى تفهم الأفكار الأساسية.',
  },
  hint: {
    en: 'Here is a hint to help you move forward without giving away the full solution. Think about what you already know about this topic.',
    ar: 'هذا تلميح لمساعدتك على التقدم دون الكشف عن الحل كاملاً. فكّر في ما تعرفه بالفعل عن هذا الموضوع.',
  },
  socratic: {
    en: 'Great question! Let me ask you something back to help you discover the answer yourself. What do you think would happen if we changed this part?',
    ar: 'سؤال رائع! لنطرح عليك سؤالاً لمساعدتك على اكتشاف الإجابة بنفسك. ما رأيك ماذا يحدث إذا غيّرنا هذا الجزء؟',
  },
  'step-by-step': {
    en: 'Let us go through this step by step. Each step builds on the previous one so you can follow the full reasoning.',
    ar: 'هيا نمرّ بهذه الخطوات واحدة تلو الأخرى. كل خطوة تعتمد على السابقة حتى تفهم المسار كاملاً.',
  },
  'exam-prep': {
    en: 'Here is exam-focused guidance: focus on the key concepts that are most likely to appear, and practice explaining them in your own words.',
    ar: 'هذا توجيه مخصص للامتحان: ركّز على المفاهيم الأساسية الأكثر ظهوراً، وتمرن على شرحها بلغتك الخاصة.',
  },
  revision: {
    en: 'Let us review the key points. The most important ideas here are... Try recalling them before reading further.',
    ar: 'لنراجع النقاط الأساسية. أهم الأفكار هنا هي... حاول تذكرها قبل المتابعة.',
  },
  'error-explanation': {
    en: 'Here is what went wrong and why. Understanding this mistake will help you avoid it next time.',
    ar: 'هذا ما خطأ وسببها. فهم هذا الخطأ يساعدك على تجنيه المرة القادمة.',
  },
  'full-solution': {
    en: 'Here is the full solution. Make sure you understand each step rather than just copying the result.',
    ar: 'هذا الحل الكامل. تأكد أنك تفهم كل خطوة بدلاً من النسخ فقط.',
  },
  'guided-solution': {
    en: 'Let me guide you toward the solution. I will show you the structure and help you fill in the important parts yourself.',
    ar: 'سأرشدك نحو الحل. سأظهر لك الهيكل وأساعدك على ملء الأجزاء المهمة بنفسك.',
  },
  assist: {
    en: 'I am here to help you learn. Let me know what you are working on and I will do my best to assist you.',
    ar: 'أنا هنا لمساعدتك في التعلم. أخبرني ما الذي تعمل عليه وسأبذل قصارى جهدي لمساعدتك.',
  },
};

function getDemo(mode: string, language: 'en' | 'ar'): string {
  return (DEMO_RESPONSES[mode] ?? DEMO_RESPONSES.assist)[language];
}

router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const { prompt, mode, language = 'en' } = aiRequestSchema.parse(req.body);

    void auditLogService.log({
      action: 'ai.request',
      targetType: 'ai_generation',
      actorId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { mode, language, promptLength: prompt.length },
    });

    const key = cacheKey(prompt, mode, language);
    const hit = aiCache.get(key);
    if (hit && Date.now() - hit.at < AI_CACHE_TTL_MS) {
      aiCache.delete(key);
      aiCache.set(key, hit); // refresh LRU ordering
      return res.json({
        ok: true,
        content: hit.content,
        model: hit.model,
        provider: hit.provider,
        costUsd: 0,
        latencyMs: 10,
        usedCache: true,
        safetyPassed: true,
      });
    }

    if (PROVIDERS.length === 0) {
      return res.json({
        ok: true,
        content: getDemo(mode, language),
        model: 'local-demo',
        provider: 'local-demo',
        costUsd: 0,
        latencyMs: 50,
        usedCache: false,
        safetyPassed: true,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let usedProvider: (typeof PROVIDERS)[number] | null = null;
    const failedAttempts: string[] = [];
    let response: globalThis.Response | null = null;

    // Try EVERY model on EVERY provider (not just the first model):
    // a dead/retired free model auto-falls to the next one on the same provider,
    // then to the next provider. This keeps the free chain alive when vendors
    // retire model names.
    for (const provider of PROVIDERS) {
      const cand = candidateFor(provider.name);
      const models = cand && cand.models.length ? cand.models : [provider.model];
      for (const model of models) {
        try {
          const attempt = `${provider.name}:${model}`;
          if (provider.name === 'custom' || provider.name === 'custom-2' || provider.name === 'groq' || provider.name === 'cerebras' || provider.name === 'openrouter' || provider.name === 'mistral' || provider.name === 'deepinfra' || provider.name === 'huggingface' || provider.name === 'github-models') {
            response = await fetch(`${provider.baseUrl}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}`, ...(provider.extraHeaders || {}) },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000,
                temperature: 0.7,
              }),
              signal: controller.signal,
            });
          } else if (provider.name === 'google') {
            response = await fetch(
              `${provider.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${provider.apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                signal: controller.signal,
              }
            );
          } else if (provider.name === 'ollama') {
            response = await fetch(`${provider.baseUrl}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
              }),
              signal: controller.signal,
            });
          }
          if (response && response.ok) {
            usedProvider = { ...provider, model };
            break;
          }
          failedAttempts.push(`${attempt}->http${response?.status ?? 'noresp'}`);
          response = null;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') throw err;
          failedAttempts.push(`${provider.name}:${model}->err`);
          response = null;
          continue;
        }
      }
      if (usedProvider) break;
    }

    clearTimeout(timeout);

    if (!usedProvider || !response) {
      console.warn('[ai] all free providers failed:', failedAttempts.slice(0, 12).join(' | '));
      return res.json({
        ok: true,
        content: getDemo(mode, language),
        model: 'local-demo',
        provider: 'local-demo',
        costUsd: 0,
        latencyMs: 50,
        usedCache: false,
        safetyPassed: true,
        error: 'provider-fallback',
        debug: failedAttempts.slice(0, 12),
      });
    }

    const data: any = await response.json();
    let content = '';
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    if (usedProvider.name === 'custom' || usedProvider.name === 'custom-2' || usedProvider.name === 'groq' || usedProvider.name === 'cerebras' || usedProvider.name === 'openrouter' || usedProvider.name === 'mistral' || usedProvider.name === 'deepinfra' || usedProvider.name === 'huggingface' || usedProvider.name === 'github-models') {
      content = data.choices?.[0]?.message?.content ?? '';
      promptTokens = data.usage?.prompt_tokens;
      completionTokens = data.usage?.completion_tokens;
    } else if (usedProvider.name === 'google') {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const meta = data.usageMetadata;
      promptTokens = meta?.promptTokenCount;
      completionTokens = meta?.candidatesTokenCount;
    } else if (usedProvider.name === 'ollama') {
      content = data.message?.content ?? '';
      promptTokens = data.prompt_eval_count;
      completionTokens = data.eval_count;
    }

    // Persist a usage/cost record so /ai/usage reflects real provider spend.
    try {
      await aiService.recordUsage({
        studentId: userId,
        feature: `tutor:${mode}`,
        provider: (usedProvider.name === 'local-demo' ? 'LOCAL_DEMO' : 'GATEWAY_PRIMARY') as any,
        model: usedProvider.model,
        promptTokens,
        completionTokens,
        costUsd: promptTokens && completionTokens
          ? ((completionTokens * 0.000002) + (promptTokens * 0.0000005))
          : 0,
        latencyMs: 0,
        happenedAt: new Date(),
        status: UsageStatus.OK,
        courseId: req.body?.courseId,
      });
    } catch (e) {
      // Usage tracking is best-effort; a failure should not break the response.
      console.error('[ai] usage record failed:', e instanceof Error ? e.message : e);
    }

    res.json({
      ok: true,
      content,
      model: usedProvider.model,
      provider: usedProvider.name,
      costUsd: promptTokens && completionTokens
        ? ((completionTokens * 0.000002) + (promptTokens * 0.0000005))
        : 0,
      latencyMs: 0,
      usedCache: false,
      safetyPassed: true,
      promptTokens,
      completionTokens,
    });

    // Store in cache so identical requests don't consume quota again.
    if (typeof key === 'string') {
      aiCache.set(key, { content, model: usedProvider.model, provider: usedProvider.name, at: Date.now() });
      if (aiCache.size > AI_CACHE_MAX) {
        const oldest = aiCache.keys().next().value;
        if (oldest !== undefined) aiCache.delete(oldest);
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      const lang = (req.body?.language ?? 'en') as 'en' | 'ar';
      const md = (req.body?.mode ?? 'assist') as string;
      return res.status(408).json({ error: 'timeout', content: getDemo(md, lang) });
    }
    console.error('AI generate error:', e);
    const lang = (req.body?.language ?? 'en') as 'en' | 'ar';
    const md = (req.body?.mode ?? 'assist') as string;
    res.json({
      ok: true,
      content: getDemo(md, lang),
      model: 'local-demo',
      provider: 'local-demo',
      costUsd: 0,
      latencyMs: 50,
      usedCache: false,
      safetyPassed: true,
      error: 'fallback',
    });
  }
});

// ── Status endpoint: which AI providers/models are wired ──
// Lets the frontend (admin panel / AI tutor) show "self-hosted model connected".
router.get('/status', authMiddleware, async (_req: Request, res: Response) => {
  const customUrl = process.env.CUSTOM_LLM_BASE_URL || '';
  const custom2Url = process.env.CUSTOM_LLM_2_BASE_URL || '';
  async function probeOpenAI(base: string, token: string): Promise<{ ok: boolean; models: string[] }> {
    if (!base) return { ok: false, models: [] };
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(`${base.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (r.ok) {
        const j: any = await r.json().catch(() => null);
        const list = j?.data ?? j?.models ?? [];
        if (Array.isArray(list)) return { ok: true, models: list.map((m: any) => m.id ?? m.name).filter(Boolean) };
        return { ok: true, models: [] };
      }
    } catch { /* unreachable */ }
    return { ok: false, models: [] };
  }
  const custom = await probeOpenAI(customUrl, process.env.CUSTOM_LLM_API_KEY || 'local');
  const custom2 = await probeOpenAI(custom2Url, process.env.CUSTOM_LLM_2_API_KEY || 'local');
  let ollamaOk = false;
  let ollamaModels: string[] = [];
  if (process.env.OLLAMA_ENABLED !== 'false') {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`, { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) {
        const j: any = await r.json().catch(() => null);
        const list = j?.models ?? [];
        if (Array.isArray(list)) ollamaModels = list.map((m: any) => m.name).filter(Boolean);
        ollamaOk = true;
      }
    } catch { ollamaOk = false; }
  }
  res.json({
    ok: true,
    chain: PROVIDER_MODEL_CANDIDATES.map((p) => ({ name: p.name, models: p.models })),
    custom: { configured: !!customUrl, reachable: custom.ok, models: custom.models, baseUrl: customUrl },
    custom2: { configured: !!custom2Url, reachable: custom2.ok, models: custom2.models, baseUrl: custom2Url },
    ollama: { enabled: process.env.OLLAMA_ENABLED !== 'false', reachable: ollamaOk, models: ollamaModels },
    fallback: 'local-demo',
  });
});


// ── Conversations persistence (aiService is wired here) ──────────────────────

// GET /api/v1/ai/conversations — list current student's conversations
router.get('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const conversations = await aiService.listConversations(userId, limit);
    res.json({ conversations });
  } catch (e: any) {
    console.error('List conversations error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

// POST /api/v1/ai/conversations — create a new conversation
router.post('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const body = z.object({
      title: z.string().min(1).max(200),
      titleAr: z.string().optional(),
      mode: z.enum(['EXPLAIN', 'HINT', 'SOCRATIC', 'STEP_BY_STEP', 'EXAM_PREP', 'REVISION', 'ERROR_EXPLANATION', 'FULL_SOLUTION', 'GUIDED_SOLUTION', 'ASSIST']).default('ASSIST'),
      courseId: z.string().optional(),
      lessonId: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body);
    const conversation = await aiService.createConversation({
      studentId: userId,
      title: body.title,
      titleAr: body.titleAr,
      mode: body.mode as AiMode,
      courseId: body.courseId,
      lessonId: body.lessonId,
      tags: body.tags ?? [],
    });
    void auditLogService.log({
      action: 'ai.createConversation',
      targetType: 'ai_conversation',
      targetId: conversation.id,
      actorId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') ?? undefined,
      metadata: { mode: body.mode, courseId: body.courseId },
    });
    res.status(201).json({ conversation });
  } catch (e: any) {
    console.error('Create conversation error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// GET /api/v1/ai/conversations/:id — conversation with full message history (ownership enforced)
router.get('/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const conversation = await aiService.getConversation(req.params.id, userId);
    res.json({ conversation });
  } catch (e: any) {
    if (e?.message === 'forbidden') return res.status(403).json({ error: 'forbidden' });
    console.error('Get conversation error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

// POST /api/v1/ai/conversations/:id/messages — append a message to a conversation
router.post('/conversations/:id/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const body = z.object({
      role: z.enum(['USER', 'AI']),
      content: z.string().min(1),
      mode: z.enum(['EXPLAIN', 'HINT', 'SOCRATIC', 'STEP_BY_STEP', 'EXAM_PREP', 'REVISION', 'ERROR_EXPLANATION', 'FULL_SOLUTION', 'GUIDED_SOLUTION', 'ASSIST']).optional(),
      citations: z.array(z.string()).optional(),
      sourceLessonId: z.string().optional(),
      model: z.string().optional(),
      latencyMs: z.number().optional(),
      costUsd: z.number().optional(),
    }).parse(req.body);
    // Ownership check before appending.
    await aiService.getConversation(req.params.id, userId);
    const message = await aiService.addMessage({
      conversationId: req.params.id,
      studentId: userId,
      role: body.role as MessageRole,
      content: body.content,
      mode: body.mode as AiMode | undefined,
      citations: body.citations ?? [],
      sourceLessonId: body.sourceLessonId,
      model: body.model,
      latencyMs: body.latencyMs,
      costUsd: body.costUsd,
    });
    res.status(201).json({ message });
  } catch (e: any) {
    if (e?.message === 'forbidden') return res.status(403).json({ error: 'forbidden' });
    console.error('Add message error:', e);
    res.status(400).json({ error: e?.message ?? 'validation' });
  }
});

// GET /api/v1/ai/usage — current student's AI usage & cost summary
router.get('/usage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const summary = await aiService.usageSummary(userId);
    res.json({ usage: summary });
  } catch (e: any) {
    console.error('Usage summary error:', e);
    res.status(500).json({ error: 'internal-server-error' });
  }
});

export default router;
