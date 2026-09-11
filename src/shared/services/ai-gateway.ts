// ━━━─ AI Model Gateway Service (provider-agnostic abstraction) ━━━─
// Supports multiple providers, fallback chain, retry, timeout, semantic cache,
// budget limits, usage tracking, provider health, rate limiting, PII protection,
// and audit logging. Frontend calls through this; real provider wiring happens
// in production backend. Demo falls back to static responses.

import type {
  AiProvider,
  AiRequest,
  AiResponse,
  AiProviderConfig,
  AiGatewayPolicy,
  AiUsageRecord,
} from '../domain';
import { store } from './store.ts';
import { featureFlags } from './feature-flags.ts';

// ─── defaults ────────────────────────────────────────────────────────────────

const DEFAULT_PROVIDERS: AiProviderConfig[] = [
  {
    id: 'demo',
    label: 'Demo Mode',
    enabled: true,
    kind: 'demo',
    route: 'primary',
    weight: 1,
  },
];

// ─── time / budget helpers ───────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

const usageThisMonth = new Map<string, number>();

function resetMonthlyUsage() {
  const key = nowIso().slice(0, 7); // YYYY-MM
  usageThisMonth.set(key, 0);
}

function monthlyUsage(): number {
  const key = nowIso().slice(0, 7);
  if (!usageThisMonth.has(key)) resetMonthlyUsage();
  return usageThisMonth.get(key) ?? 0;
}

function addUsage(amountUsd = 0) {
  const key = nowIso().slice(0, 7);
  if (!usageThisMonth.has(key)) resetMonthlyUsage();
  usageThisMonth.set(key, (usageThisMonth.get(key) ?? 0) + amountUsd);
}

// ─── rate limiter ─────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(clientKey: string, limit: number): boolean {
  const recent = rateLimitMap.get(clientKey) ?? [];
  const windowStart = Date.now() - 60 * 1000;
  const valid = recent.filter((t) => t > windowStart);
  rateLimitMap.set(clientKey, valid);
  return valid.length < limit;
}

function recordRateLimit(clientKey: string) {
  const recent = rateLimitMap.get(clientKey) ?? [];
  recent.push(Date.now());
}

// ─── safety / PII ────────────────────────────────────────────────────────────

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
];

function redactPII(text: string): string {
  if (!featureFlags.isEnabled('ai_safety')) return text;
  let result = text;
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, '[redacted]');
  }
  return result;
}

function isUnsafe(text: string): boolean {
  if (!featureFlags.isEnabled('ai_safety')) return false;
  const lower = text.toLowerCase();
  const unsafe = [
    'how to cheat',
    'give me the answers to',
    'just tell me the answer',
    'do my homework for me',
  ];
  return unsafe.some((phrase) => lower.includes(phrase));
}

// ─── cache ───────────────────────────────────────────────────────────────────

const cache = new Map<string, { response: AiResponse; expiresAt: number }>();

function cacheKey(req: AiRequest): string {
  return `${req.conversationId ?? 'none'}:${req.lessonId ?? 'none'}:${req.courseId ?? 'none'}:${req.mode}:${req.prompt}`;
}

function getCached(req: AiRequest): AiResponse | undefined {
  if (!featureFlags.isEnabled('ai_gateway')) return undefined;
  const cfg = store.aiPolicy.get();
  if (!cfg?.semanticCacheEnabled) return undefined;
  const entry = cache.get(cacheKey(req));
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey(req));
    return undefined;
  }
  return entry.response;
}

// ─── demo responder ──────────────────────────────────────────────────────────

function _demoResponse(req: AiRequest): AiResponse {
  const mode = req.mode;
  const lang = req.language;

  const responses = {
    en: {
      explain: 'Here is a clear explanation of the concept. Let me break it down step by step so you can understand the key ideas.',
      hint: 'Here is a hint to help you move forward without giving away the full solution. Think about what you already know about this topic.',
      socratic: 'Great question! Let me ask you something back to help you discover the answer yourself. What do you think would happen if we changed this part?',
      'step-by-step': 'Let us go through this step by step. Each step builds on the previous one so you can follow the full reasoning.',
      'exam-prep': 'Here is exam-focused guidance: focus on the key concepts that are most likely to appear, and practice explaining them in your own words.',
      revision: 'Let us review the key points. The most important ideas here are... Try recalling them before reading further.',
      'error-explanation': 'Here is what went wrong and why. Understanding this mistake will help you avoid it next time.',
      'full-solution': 'Here is the full solution. Make sure you understand each step rather than just copying the result.',
      'guided-solution': 'Let me guide you toward the solution. I will show you the structure and help you fill in the important parts yourself.',
      assist: 'I am here to help you learn. Let me know what you are working on and I will do my best to assist you.',
    },
    ar: {
      explain: 'هذا شرح واضح للمفهوم. دعوني أقسمه إلى خطوات حتى تفهم الأفكار الأساسية.',
      hint: 'هذا تلميح لمساعدتك على التقدم دون الكشف عن الحل كاملاً. فكّر في ما تعرفه بالفعل عن هذا الموضوع.',
      socratic: 'سؤال رائع! لنطرح عليك سؤالاً لمساعدتك على اكتشاف الإجابة بنفسك. ما رأيك ماذا يحدث إذا غيّرنا هذا الجزء؟',
      'step-by-step': 'هيا نمرّ بهذه الخطوات واحدة تلو الأخرى. كل خطوة تعتمد على السابقة حتى تفهم المسار كاملاً.',
      'exam-prep': 'هذا توجيه مخصص للامتحان: ركّز على المفاهيم الأساسية الأكثر ظهوراً، وتمرن على شرحها بلغتك الخاصة.',
      revision: 'لنراجع النقاط الأساسية. أهم الأفكار هنا هي... حاول تذكرها قبل المتابعة.',
      'error-explanation': 'هذا ما خطئ وسببها. فهم هذا الخطأ يساعدك على تجنبه المرة القادمة.',
      'full-solution': 'هذا الحل الكامل. تأكد أنك تفهم كل خطوة بدلاً من النسخ فقط.',
      'guided-solution': 'سأرشدك نحو الحل. سأظهر لك الهيكل وأساعدك على ملء الأجزاء المهمة بنفسك.',
      assist: 'أنا هنا لمساعدتك في التعلم. أخبرني ما الذي تعمل عليه وسأبذل قصارى جهدي لمساعدتك.',
    },
  };

  const text =
    responses[lang]?.[mode] ??
    responses.en[mode] ??
    'Here is a helpful response tailored to your learning context.';

  return {
    ok: true,
    content: text,
    model: 'demo',
    latencyMs: 400 + Math.floor(Math.random() * 600),
    costUsd: 0,
    provider: 'local-demo' as AiProvider,
    usedCache: false,
  };
}

// ─── cache helpers ───────────────────────────────────────────────────────────

function setCached(req: AiRequest, response: AiResponse, ttlMs = 5 * 60 * 1000) {
  cache.set(cacheKey(req), { response, expiresAt: Date.now() + ttlMs });
}

// ─── default policy ──────────────────────────────────────────────────────────

const DEFAULT_POLICY: AiGatewayPolicy = {
  defaultProvider: 'demo',
  fallbackChain: ['demo'],
  semanticCacheEnabled: true,
  budgetUsdMonthly: 2500,
  budgetAlertThreshold: 80,
  rateLimitRequestsPerMinute: 60,
  piiRedactionEnabled: true,
  unsafeBlockEnabled: true,
  academicIntegrityDefaultMode: 'assist',
};

// ─── public API ───────────────────────────────────────────────────────────────

export const aiGateway = {
  /** Load provider config + policy from store (fall back to defaults). */
  config: (): { providers: AiProviderConfig[]; policy: AiGatewayPolicy } => {
    const providers = store.aiProviders.list();
    const policy = store.aiPolicy.get() ?? DEFAULT_POLICY;
    return {
      providers: providers.length ? providers : DEFAULT_PROVIDERS,
      policy,
    };
  },

  /** Save provider config + policy. */
  saveConfig: (providers: AiProviderConfig[], policy: AiGatewayPolicy) => {
    store.aiProviders.save(providers);
    store.aiPolicy.save(policy);
  },

  /** Invalidate cache for a conversation. */
  invalidateConversation: (conversationId: string) => {
    for (const key of cache.keys()) {
      if (key.startsWith(conversationId + ':')) cache.delete(key);
    }
  },

  /** Current monthly usage summary. */
  usageSummary: () => {
    const policy = store.aiPolicy.get() ?? DEFAULT_POLICY;
    const used = monthlyUsage();
    const budget = policy.budgetUsdMonthly ?? 0;
    return {
      used,
      budget,
      remaining: budget - used,
      percent: budget ? (used / budget) * 100 : 0,
      resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    };
  },

  /** Provider health (demo: all healthy). */
  providerHealth: () => {
    const providers = store.aiProviders.list();
    return providers.map((p) => ({
      id: p.id,
      label: p.label,
      healthy: true,
      lastChecked: nowIso(),
    }));
  },

  /** Call the AI with a request. Returns AiResponse. */
  send: (req: AiRequest): Promise<AiResponse> => {
    return new Promise((resolve) => {
      // 1. PII redaction
      const sanitizedPrompt = featureFlags.isEnabled('ai_safety')
        ? redactPII(req.prompt)
        : req.prompt;

      const safeReq: AiRequest = { ...req, prompt: sanitizedPrompt };

      // 2. Safety check
      if (featureFlags.isEnabled('ai_safety') && isUnsafe(safeReq.prompt)) {
        const policy = store.aiPolicy.get() ?? DEFAULT_POLICY;
        const fallbackMode = policy.academicIntegrityDefaultMode ?? 'assist';
        const answer = _demoResponse({ ...safeReq, mode: fallbackMode });
        resolve({
          ...answer,
          content: answer.content + '\n\nNote: I am here to help you learn, not just give answers. Let us work through this together.',
          safetyPassed: false,
        });
        return;
      }

      // 3. Cache lookup
      if (featureFlags.isEnabled('ai_gateway')) {
        const cached = getCached(safeReq);
        if (cached) {
          resolve({ ...cached, usedCache: true, latencyMs: 5 });
          return;
        }
      }

      // 4. Rate limit
      const clientKey = safeReq.studentId ?? 'anonymous';
      const policy = store.aiPolicy.get() ?? DEFAULT_POLICY;
      const limit = policy.rateLimitRequestsPerMinute ?? 60;
      if (!checkRateLimit(clientKey, limit)) {
        resolve({
          ok: false,
          content: 'Too many requests. Please wait a moment and try again.',
          error: 'rate-limited',
          provider: 'local-demo' as AiProvider,
        });
        return;
      }

      // 5. Budget check
      if (policy.budgetUsdMonthly && monthlyUsage() >= policy.budgetUsdMonthly) {
        resolve({
          ok: false,
          content: 'Monthly budget reached. Please contact your administrator.',
          error: 'budget',
          provider: 'local-demo' as AiProvider,
        });
        return;
      }

      // 6. Demo response
      const start = Date.now();
      const response = _demoResponse(safeReq);
      const latency = Date.now() - start;

      // 7. Track usage
      const usage: AiUsageRecord = {
        id: store.uid(),
        studentId: safeReq.studentId,
        conversationId: safeReq.conversationId,
        feature: 'ai-tutor',
        provider: response.provider ?? 'local-demo',
        model: response.model,
        promptTokens: Math.ceil(safeReq.prompt.length / 4),
        completionTokens: Math.ceil(response.content.length / 4),
        costUsd: response.costUsd,
        latencyMs: latency,
        happenedAt: nowIso(),
        status: response.error ? 'error' : 'ok',
      };
      store.usage.save(usage);
      addUsage(response.costUsd ?? 0);

      // 8. Cache result
      setCached(safeReq, response);

      // 9. Rate limit bookkeeping
      recordRateLimit(clientKey);

      resolve({ ...response, latencyMs: latency });
    });
  },
};
