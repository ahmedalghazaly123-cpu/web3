# PRODUCT COMPLETION ROADMAP — LearnPilot v2

> Derived from `FINAL_40_PHASE_PRODUCT_AUDIT.md`. Statuses: COMPLETE/PARTIAL/FOUNDATION/SIMULATION/MISSING. Only **Phase 37 (Backend/DB/Auth)** is COMPLETE. The 39 remaining phases are grouped into dependency-ordered waves. Priorities: **P0** = blocks product claims / data integrity; **P1** = required for MVP production; **P2** = quality-of-experience / parity; **P3** = stretch.

---

## 1. WAVE 0 — Gate (1 item, COMPLETE)

| # | Phase | Status | Priority | Owner action |
|---|---|---|---|---|
| 37 | Backend/DB/Auth | ✅ COMPLETE | — | None — preserved & E2E-verified (Express+Prisma+PostgreSQL+bcrypt+sessions+RBAC+IDOR). Backend is real; do not refactor. |

---

## 2. WAVE 1 — CLOSE THE CORE LOOP (P0–P1)
**Goal:** Make learning data actually reach the backend and flow UI→engine→backend. This is the single dominant gap: engines are real but localStorage-bound, and `api.learning.*` has **0 callers**.

| # | Phase | Current | What must be implemented | Must finish first | Priority |
|---|---|---|---|---|---|
| 1 | Learning Intelligence Foundation | PARTIAL | (a) Add API adapter in `store.ts` or a new `remoteStoreBackend` so `learningEvents.ingest/saveEvent` POST to `/api/v1/learning/events`; (b) route Quiz/Exam UI through `recordQuestionAttempt`+`adaptiveQuizEngine.processAnswer` so `question-answered` evidence is emitted (kills `Quiz.tsx:44`/`Exam.tsx:43` `lastQuizScore` bypass). | 37 | P0 |
| 7 | Adaptive Quiz Engine | PARTIAL | Wire `Quiz.tsx`/`Exam.tsx` to `adaptiveQuizEngine` (`createAdaptiveSession`/`nextQuestion`/`processAnswer`/`canAskQuestion`); emit `quiz-submitted` evidence. | 1 | P0 |
| 19 | Advanced Assessment | PARTIAL | `Results.tsx` must pull persisted attempt data from backend (`/learning/events`+`/progress`) instead of `localStorage.lastQuizScore`; emit `exam-submitted`. | 1 | P0 |
| 11 | Planner | FOUNDATION | `Planner.tsx` must render `planStudy` output (`store.plans`/`api.learning`) instead of hardcoded `mockSessions` (`:19`); subscribe to path engine. | 1 | P0 |
| 2 | Mastery / 4 / 5 / 6 / 8 / 9 / 10 / 20 | PARTIAL/FOUNDATION | Once (a) is in place, switch each engine's `store.*` reads/writes to the backend API (read `/learning/mastery` & `/learning/events`; upsert via `/learning/mastery`). | 1 | P1 |

**Deliverable target:** After Wave 1, the loop is `Activity → Event → Evidence → Mastery → Decisions → Path → Quiz → SR → Planner → Tutor` with **backend-persisted** learning data, and the auth→backend→DB loop already works.

---

## 3. WAVE 2 — AUTH-LEVEL GAPS & CORRECTNESS (P1)
**Goal:** Fix the few real security/correctness bugs flagged in code.

| # | Phase | Current | What must be implemented | Must finish first | Priority |
|---|---|---|---|---|---|
| 24 | Gamification | PARTIAL | Add idempotency to `awardMeaningfulXp` (dedup key on `(studentId,kind,window)`); unify `Achieve.tsx` onto `engagementEngine.awardMeaningfulXp` instead of `productivity.awardXp('demo')`; persist to backend. | 1 | P1 |
| 36 | Security | PARTIAL | (a) Replace stale `securityAudit()` text (`production.ts:60-68` claims "no backend sessions"); (b) add audit-log persistence to DB (`audit_logs` table exists, never written); (c) CSRF cookie config; (d) retention/deletion/consent API. | 37 | P1 |
| 10 | Risk & Struggle | FOUNDATION | Consolidate the **dual risk implementations**: `trust.risk()` (used by `Care.tsx`) vs `riskEngine` (`risk-engine.ts`); wire Care UI to `riskEngine`. | — | P1 |
| 3 | Knowledge Graph | PARTIAL | Remove `Math.random` demo seeding in `Hub.tsx:43`; use deterministic fixtures. | 2 | P2 |

---

## 4. WAVE 3 — AI REALITY (P0–P1)
**Goal:** Replace static demo responses with real provider integration (gated behind env).

| # | Phase | Current | What must be implemented | Must finish first | Priority |
|---|---|---|---|---|---|
| 12 | AI Tutor | FOUNDATION | Connect `aiGateway.send` to a real provider (OpenAI/Anthropic) when `AI_API_KEY` set; keep `local-demo` fallback. Emit conversation messages to backend (`/ai_*` tables exist). | 1 | P0 |
| 13 | RAG | FOUNDATION | Add embeddings + vector DB (e.g., pgvector on the existing Postgres, or a vector store); ingestion pipeline over `courses`/`lessons`; real retrieval + LLM synthesis; `Ask.tsx` must call retrieval not `aiStudio.askCourse` demo text. | 12 | P0 |
| 34 | AI Gateway | SIMULATION | `routeRequest` already returns `local-demo` when no key — extend to real multi-provider routing/retry/timeout/health when keys exist. | 12 | P1 |
| 38 | Production ML | MISSING | Define ML readiness: dataset from learning events, training/validation, versioned inference, drift monitoring. (Engines are already ML-ready shapes.) | 12 | P1 |

---

## 5. WAVE 4 — REMAINING FOUNDATIONS & UI (P1–P2)

| # | Phase | Current | What must be implemented | Priority |
|---|---|---|---|---|
| 8 | Spaced Repetition | FOUNDATION | FSRS calibration; mastery auto-projection; SR UI flow; backend sync | P1 |
| 9 | Dynamic Paths | FOUNDATION | Goals/deadlines/velocity inputs; recalculation triggers; UI consumption | P1 |
| 14 | Voice | SIMULATION | STT (Whisper/Web Speech) + TTS provider; permission/recovery handling | P2 |
| 15 | Audio→Notes | FOUNDATION | Real transcription (STT) → feed `audioToNotes` | P1 |
| 16 | Mind Maps | FOUNDATION | Content extraction + AI generation; render/persistence | P2 |
| 17 | Study Tools | FOUNDATION | Real (non-template) replies for study partner / micro-lesson / prerequisite check; UI→service trace | P1 |
| 18 | Exam Simulator | FOUNDATION | Honor blueprint topics/difficulty; scoring/feedback/history/adaptation; `Exam.tsx` integration | P1 |
| 21 | Career Finder | FOUNDATION | Real labor-market mapping vs 3 hardcoded directions | P1 |
| 22 | Simulator | FOUNDATION | Scenario/state-action simulation vs linear estimate | P2 |
| 23 | Goals & Recovery | FOUNDATION | Goal→mastery linkage, trigger detection, monitoring | P1 |
| 25 | Focus & Attention | PARTIAL | Real attention detection (opt-in); Pomodoro UI | P2 |
| 26 | Collaboration | SIMULATION | WebSocket presence/messaging/sync between peers | P0 |
| 27 | Virtual Classroom | FOUNDATION | Roles/presence/controls/realtime session lifecycle | P0 |
| 28 | Teacher AI | PARTIAL | Wire `TeacherAnalytics.tsx` to `teacherInsights` (not hardcoded `weekPoints`); real data | P1 |
| 29 | Parent | PARTIAL | Parent auth/relationship enforcement + authorization + alerts pipeline; parent UI | P1 |
| 30 | Institution | FOUNDATION | Institution model usage, multi-tenancy/isolation, classes, permissions | P1 |

---

## 6. WAVE 5 — PRODUCTION READINESS (P0)
**Goal:** Ship with confidence, durability, and observability.

| # | Phase | Current | What must be implemented | Priority |
|---|---|---|---|---|
| 31 | Offline/PWA | MISSING | `manifest.webmanifest` + service worker (Workbox); real offline queue with sync/conflict/recovery; `enqueueOffline`/`drainOffline` over IndexedDB | P0 |
| 32 | Sandbox | MISSING | Real isolated code execution (container/wasm worker) with CPU/mem/timeout/fs/net/process controls — not static regex | P0 |
| 33 | Certificates | PARTIAL | Crypto-secure hash (SHA-256); revocation list; `/verify/[code]` page; issuance gated on achievement | P1 |
| 35 | AI Evaluation | FOUNDATION | Eval dataset, repeatability, model comparison, regression suite, persistence | P1 |
| 39 | Infra/Observability | MISSING | Container image, reverse proxy/TLS/DNS, autoscaling, Redis queues; metrics/logs/traces/alerts; backups/restore/DR; load/stress/soak tests | P0 |

---

## 7. WAVE 6 — RELEASE PROCESS (P0)
| # | Phase | Current | What must be implemented | Priority |
|---|---|---|---|---|
| 40 | Final Audit | PARTIAL | Re-run full audit with: live Postgres backend tests, Playwright E2E against backend, `npm run build`, oxlint (in a working env), and security/perf proof. Sign off "PRODUCT COMPLETE" only when >1 phases reach COMPLETE and the core loop persists to backend. | P0 |

---

## 8. COMPLETION TARGETS

**"PRODUCT COMPLETE"** requires:
1. **Wave 1 closed** — `api.learning.*` is called from the frontend; all 9 test files still pass; Quiz/Exam/Planner backed by engines; learning data persists to PostgreSQL (verify: clear localStorage → data still loads from `/learning/*`).
2. **Wave 2 closed** — no `lastQuizScore`/`mockSessions` demo bypasses remain in the active UI path; `securityAudit()` text accurate; idempotency present.
3. **Wave 3 closed** — a real AI provider is callable (key in env) with demo fallback; RAG uses embeddings+vector; `routeRequest` routes to a real provider.
4. **Wave 5 closed** — PWA manifest + SW, real sandbox, infra/deploy + observability, backups.
5. **Wave 6** — final E2E + security + perf sign-off.

### Milestone checkpoints
- **M1 (P0):** Frontend calls `api.learning.recordEvent`/`upsertMastery`/`getProgress`; backend learning E2E test written (POST event → GET events → DB row). ← *next immediate objective*
- **M2 (P0):** Playwright covers a learning action (quiz submit → `/learning/events` → mastery update) end-to-end through the real backend.
- **M3 (P0):** PWA + SW + real offline sync on staging.
- **M4 (P0):** AI Tutor + RAG backed by a real provider with fallback.

---

## 9. CURRENT TEST & VERIFY GAPS

| Gap | Why it matters | When to close |
|---|---|---|
| oxlint native binding broken in sandbox | Cannot run lint locally (not a code issue) | Any env with correct arch |
| Backend tests require live PostgreSQL | `server/tests/*.test.ts` are real but untested in-window | Wave 1 M1 (spin up Postgres) |
| Playwright requires :3000 + :4000 + PG | E2E not re-run in-window | Wave 1 M2 |
| Frontend build not run in-window | `dist/` is from prior build | Wave 6 |

---

## 10. SUMMARY

- **COMPLETE: 1/40** (Phase 37 only).
- **Next objective (P0):** Wire the frontend intelligence layer to the existing backend learning API (`api.learning.*`) and close the `lastQuizScore`/`mockSessions` UI bypasses. This single change simultaneously advances Phases 1, 7, 11, 19, 24, 28, 36 and unlocks trustworthy backend persistence for all learning phases.
- No implementation begins until Wave 1/M1 is agreed.
