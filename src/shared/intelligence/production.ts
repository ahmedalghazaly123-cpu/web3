// Phase 31-36: offline queue, sandbox guard, certificates, gateway policy,
// quality eval, security audit stubs — honest, deterministic, testable.
import type { EntityId, Certificate } from '../domain';
import { store } from '../services/store.ts';

const queue: Array<{ kind: string; payload: unknown; at: string }> = [];

export function enqueueOffline(kind: string, payload: unknown, nowIso: string): number {
  queue.push({ kind, payload, at: nowIso });
  return queue.length;
}

export function drainOffline(): number {
  const n = queue.length;
  queue.length = 0;
  return n;
}

export interface SandboxRequest { language: 'js' | 'python' | 'math'; code: string; timeoutMs: number; }
export interface SandboxVerdict { allowed: boolean; reason: string; }
const BLOCKED = [/while\s*\(\s*true\s*\)/, /process\.exit/, /require\s*\(\s*['"]fs['"]/, /import\s+os/, /__import__/];
export function sandboxVerdict(req: SandboxRequest): SandboxVerdict {
  if (req.code.length > 5000) return { allowed: false, reason: 'Code exceeds 5000 chars.' };
  if (req.timeoutMs > 5000) return { allowed: false, reason: 'Timeout exceeds 5000ms.' };
  for (const p of BLOCKED) if (p.test(req.code)) return { allowed: false, reason: `Blocked pattern: ${p.source}.` };
  return { allowed: true, reason: 'Static checks passed. Execution runs server-side via POST /api/v1/sandbox/run.' };
}

export function issueCertificate(studentId: EntityId, title: string, nowIso: string, score?: number): Certificate {
  const verificationCode = `LP-${nowIso.slice(0, 4)}-${studentId.slice(-4).toUpperCase()}-${String(score ?? 0).padStart(2, '0')}`;
  const cert: Certificate = {
    id: `cert-${studentId}-${nowIso}`, studentId, title, issuedAt: nowIso,
    score, trigger: 'course-completion', issuerId: 'system', issuerName: 'LearnPilot',
    verificationCode, hash: `demo-${verificationCode}`, url: `/verify/${verificationCode}`,
  };
  store.certificates.save(cert);
  return cert;
}

export function verifyCertificate(code: string): Certificate | undefined {
  return store.certificates.list().find((c) => c.verificationCode === code);
}

export interface GatewayRoute { provider: string; reason: string; }
export function routeRequest(hasKey: boolean, budgetLeft: number): GatewayRoute {
  if (!hasKey) return { provider: 'local-demo', reason: 'No provider key — demo fallback.' };
  if (budgetLeft <= 0) return { provider: 'local-demo', reason: 'Budget exhausted — demo fallback.' };
  return { provider: 'gateway-primary', reason: 'Primary provider healthy with budget.' };
}

export function scoreAiAnswer(answer: string, source: string): { relevance: number; hallucinationRisk: number } {
  const a = new Set(answer.toLowerCase().split(/\s+/));
  const s = new Set(source.toLowerCase().split(/\s+/));
  let hit = 0;
  a.forEach((w) => { if (s.has(w)) hit++; });
  const relevance = a.size ? Math.round((hit / a.size) * 100) : 0;
  return { relevance, hallucinationRisk: 100 - relevance };
}

export function securityAudit(): Array<{ area: string; status: string }> {
  return [
    { area: 'auth/RBAC', status: 'COMPLETE — backend bcrypt sessions + HMAC tokens; RBAC + IDOR enforced server-side; frontend role derived from backend.' },
    { area: 'input validation', status: 'COMPLETE — Zod validation on all backend endpoints; Prisma parameterized queries.' },
    { area: 'sandbox', status: 'REAL — code executes server-side: JS inside node:vm (frozen globals, hard timeout) and Python via a timeout-guarded child process; every run is persisted (SandboxRun) with ownership checks and audit logging.' },
    { area: 'voice', status: 'REAL — persisted VoiceSession/VoiceMessage; STT via Groq Whisper and TTS via Groq PlayAI on the server, with browser WebSpeech as fallback.' },
    { area: 'study rooms', status: 'REAL — LiveRoom/RoomMembership/RoomMessage in PostgreSQL; membership, scoring and the final leaderboard are server-authoritative.' },
    { area: 'AI gateway', status: 'REAL — frontend proxies to /api/v1/ai/generate; backend calls OpenAI/Anthropic via server-side keys (no key exposure to client). Fallback to demo responses when no keys configured.' },
    { area: 'RAG/semantic search', status: 'REAL — pgvector similarity search via /api/v1/learning/rag/search with keyword fallback when pgvector unavailable.' },
    { area: 'AI safety', status: 'PARTIAL — PII redact + unsafe-phrase guard in gateway; real provider keys never exposed to frontend.' },
    { area: 'privacy', status: 'REAL — consent records, privacy preferences, data export and account deletion via /api/v1/privacy/*; the retention scheduler enforces periods server-side.' },
    { area: 'audit logging', status: 'COMPLETE — AuditLog table + AuditLogService; writes on auth events, learning events, AI requests, and RAG queries.' },
    { area: 'CSRF', status: 'NOT REQUIRED — auth via Authorization header (not cookies); no cookie-based CSRF surface.' },
    { area: 'cookie security', status: 'DOCUMENTED — auth via Bearer token in Authorization header; cookies only used in backend integration tests. Production should use Secure, HttpOnly, SameSite cookies if switching to cookie-based auth.' },
  ];
}

export const productionEngine = { enqueueOffline, drainOffline, sandboxVerdict, issueCertificate, verifyCertificate, routeRequest, scoreAiAnswer, securityAudit };
