# LEARNPILOT — FULL PRODUCT STATE AUDIT (EVIDENCE-BASED)

**Date:** 2026-09-12 · **Branch:** master · **Commit:** `d65f4bd`
**Method:** Fresh inspection of the current repository + executed tests + live backend runtime verification. Historical reports (`FINAL_40_PHASE_PRODUCT_AUDIT.md`, `40_PHASE_COMPLETION_AUDIT.md`, `PRODUCT_COMPLETION_ROADMAP.md`, `BACKEND_FINAL_STATUS.md`, `BACKEND_RUNTIME_VERIFICATION_REPORT.md`, `BROWSER_E2E_TEST_REPORT.md`) are treated as **HISTORICAL STATUS** only; every claim below was re-verified against current code.
**Missing documents (NOT FOUND):** `MISSING_FEATURES_COMPLETION_REPORT.md` — does not exist.

---

## 1. VERIFIED TEST / BUILD / RUNTIME EVIDENCE (this audit run)

| Command | Result |
|---|---|
| `npx vitest run` (frontend) | **PASS — 9 files / 106 tests** |
| `server: npx vitest run` | **PASS — 4 files / 16 tests** (auth 5, rbac 3, learning 5, validation 3) |
| `npx tsc --noEmit -p tsconfig.app.json` | **FAIL — 1 error:** `src/features/student/pages/Dashboard.tsx(134,11): TS17002 Expected corresponding JSX closing tag for 'div'` (a `<div>` opened at line 129 is never closed; line 134 has `</Card>`) |
| `npm run build` (tsc -b && vite build) | **FAIL** — stops at the same Dashboard.tsx error; vite build never runs (build-out.txt contains only the npm header) |
| Playwright browser E2E | **NOT RUN in this audit** (spec exists: `tests/e2e/learning-persistence.spec.ts`; stale `playwright-report/` from a prior run — historical only) |
| Runtime: `POST /auth/signup` (role `student`) | **PASS** — 201, returns token, role normalized to `STUDENT` |
| Runtime: `POST /learning/events` (LESSON_COMPLETED + clientKey) | **PASS** — 201, event persisted, audit log written (`learning.event.LESSON_COMPLETED`) |
| Runtime: same event re-sent (same clientKey) | **PASS** — `duplicate: true`, no duplicate row (idempotency verified live) |
| Runtime: `GET /learning/mastery` after LESSON_COMPLETED event | **`{"mastery":[]}`** — **backend does NOT derive mastery from events**; mastery only via explicit upsert |
| Runtime: `GET /learning/events` without token | **401** — auth enforced |
| Runtime: `POST /auth/login` (same user) | **PASS** |

**Headline defect found in this run:** the frontend does not compile (`tsc -b` fails on Dashboard.tsx) → `npm run build` is **BROKEN**.

---

## 2. ACTUAL ARCHITECTURE (verified)

```
Browser → React 19 + Vite + react-router + i18n (ar/en, RTL) + Tailwind
        → AuthProvider (src/app/layout/AuthProvider.tsx) → api.ts (fetch, Bearer token, VITE_API_URL)
        → Express (server/src/index.ts) → middleware/auth.ts (HMAC token, sessions table)
        → services/* → PrismaClient → PostgreSQL
Engines (src/shared/intelligence/*): deterministic, unit-tested, persist via src/shared/services/store.ts
        → localStorage (lp-store-*) — NOT the backend
```

- Backend routes: `auth`, `users`, `learning`, `ai`, `health` (`/health`, `/ready`). Helmet, CORS, rate-limit 100/min, 10kb body cap, Zod validation.
- Prisma models (migration `20260911111642_init`): User, Session, Course, Lesson, Module, LearningEvent, MasteryState, GraphNode/Edge, Plan/PlanItem, ExamResult, AuditLog, AiConversation/AiMessage, RagDocument/RagChunk, Analytics, Parent/Institution/Collaboration tables.
- **Dual persistence worlds:** backend/PostgreSQL (real, reachable, tested) vs frontend `store.ts` localStorage (all intelligence engines). `api.learning.recordEvent` is exposed but has **0 production callers**; Quiz.tsx:44 / Exam.tsx:43 still write `localStorage.lastQuizScore`.

---

## 3. STATUS PER AREA (COMPLETE/PARTIAL/FOUNDATION/SIMULATION/MISSING/BROKEN/BLOCKED/NOT TESTED)

| Area | Status | Evidence (current code) | Main gap |
|---|---|---|---|
| Frontend shell/router/i18n/RTL | PARTIAL | `src/app/router.tsx`, ar/en locales; 106 unit tests PASS | **Does not compile** (Dashboard.tsx:134) |
| Backend API | PARTIAL | 16/16 tests PASS; runtime verified this run | Only auth/users/learning/ai/health; no courses/quiz/exam/planner endpoints consumed by UI |
| Auth (signup/login/logout/session) | COMPLETE | bcrypt, sessions table, HMAC token, AuditLog on signup/login/logout; runtime verified | Logout deletes **all** user sessions; no rotation |
| RBAC / IDOR | PARTIAL | rbac.test.ts PASS (student↛admin; admin read allowed); server-side role+ownership checks in users.ts | Per-resource ownership for course/lesson/plan/exam unenforceable — those endpoints don't exist; many checks are frontend-only |
| Learning events (backend) | COMPLETE | POST/GET, clientKey idempotency, audit log — runtime verified | Nothing in the UI calls it |
| Mastery (backend) | PARTIAL | upsert + GET exist; runtime returns `[]` after event | **Not derived from events** |
| Quiz | SIMULATION | Quiz.tsx:44 → `localStorage.lastQuizScore`; `learning-engine.ts:38` random `nextQuestion`; `adaptiveQuizEngine` never called by UI | No backend sessions/attempts/persistence/adaptation in the user path |
| Exam | SIMULATION | Exam.tsx:43 lastQuizScore; `study-exam.ts simulateExam` slices first ≤10 questions; examResultService unused by UI | No end-to-end exam |
| Planner | SIMULATION | Planner.tsx:19 hardcoded `mockSessions`; `planStudy()` tested but unconsumed | Not connected |
| Mastery engine (FE) | PARTIAL | `mastery.ts` + tests; **but** `seedDemoData` (mastery.ts:292-298) uses Math.random for attempts/confidence | Demo seed in production module; localStorage-only |
| Knowledge graph | FOUNDATION | deterministic seed, prerequisites, tests | Student state in localStorage; no backend traversal |
| Mistakes/Misconceptions | PARTIAL | observer + `classifyMisconception` tested; persisted to localStorage | Not backend-linked; not in adaptive path |
| Risk engine | FOUNDATION | `risk-engine.ts` + duplicate `trust.risk()` (Care.tsx uses trust.risk) | **Two competing implementations**; localStorage |
| Spaced repetition | PARTIAL | `spaced-repetition.ts` SM-2-like schedule + tests | localStorage; not wired to backend review events |
| Gamification | PARTIAL | `engagement.ts awardMeaningfulXp` — **idempotency present** (dayKey Set; code + test verified); Achieve.tsx awards XP on button click (not events); `utils.ts:71 generateStreak()` = Math.random | No backend XP; demo streak |
| AI provider | SIMULATION | `ai-gateway.ts:161-165` `_demoResponse` (model:'demo', provider:'local-demo', fake latency); `production.ts routeRequest` → local-demo; **no provider SDK/keys on backend** | No real LLM path |
| AI gateway | FOUNDATION | frontend PII redaction + unsafe-phrase block (ai-gateway.ts:75-98) | routing/fallback/usage/cost are demo; backend `/ai` not connected to any provider |
| RAG | SIMULATION | `course-retrieval.ts` keyword overlap; RagDocument/RagChunk tables unused; retrieval client-side over demo data | No embeddings/vector/authz-filtered retrieval |
| AI conversation persistence | MISSING | AiConversation/AiMessage tables exist; no callers | — |
| AI study tools | SIMULATION | `ai-studio.ts` templates | Not real AI, not persisted |
| Voice / Audio-notes / Mind map | FOUNDATION/SIMULATION | STT/TTS stubs; transcription pipeline without real STT; mind map without content extraction | — |
| Teacher analytics | **HARDCODED** | `TeacherAnalytics.tsx` weekPoints/monthPoints/byClass/insights are literal arrays | No backend aggregation |
| Parent | OUT OF CONFIRMED SCOPE | PARENT role in Prisma enum; no verified feature | — |
| Institution | OUT OF CONFIRMED SCOPE | tables in schema; no verified feature | — |
| Collaboration | SIMULATION | `collab.ts:10` Math.random codes; simulated presence; no WebSocket anywhere | — |
| PWA | MISSING | no manifest/service worker in build inputs | — |
| Sandbox | BLOCKED | static blocklist verdicts (`production.ts sandboxVerdict`); no real isolation | — |
| Certificates | SIMULATION | `trust.ts:25-27` Math.random code + `hash*31` weak "hash" | No crypto, no verification endpoint |
| Audit logging | PARTIAL | auth + learning routes write AuditLog (code-verified) | No admin query endpoint; admin/owner actions untestable (routes absent) |
| Data lifecycle | MISSING | no retention/deletion/consent API | — |
| AI evaluation | MISSING | no datasets/goldens/regression harness | — |
| ML | BLOCKED — INSUFFICIENT REAL DATA | only test/demo rows in DB | — |
| Infra (monitoring/backups/deploy) | MISSING | no Docker/CI/observability in repo | — |

---

## 4. MASTER GAP MATRIX (P0/P1 focus)

| Area | Feature | Status | Evidence | Missing | Blocks launch | Priority | Required action |
|---|---|---|---|---|---|---|---|
| FE | Compiling app | BROKEN | Dashboard.tsx:134 TS17002 | build fails | **YES** | P0 | close unclosed `<div>` (line 129) |
| FE→BE | Learning persistence | MISSING (in UI) | `api.learning` 0 production callers; Quiz.tsx:44/Exam.tsx:43 localStorage | events/attempts/progress not persisted to PostgreSQL | **YES** | P0 | wire Quiz/Exam/lesson UI → `api.learning.recordEvent` + mastery |
| Quiz | Real quiz flow | SIMULATION | Quiz.tsx:44; learning-engine.ts:38 Math.random | server-side sessions/attempts/scoring/adaptation | **YES** | P0 | adaptiveQuizEngine + backend attempts |
| Exam | Real exam flow | SIMULATION | Exam.tsx:43; examResultService unused | end-to-end exam | YES | P0/P1 | UI→engine→backend |
| Planner | Plan from real data | SIMULATION | Planner.tsx:19 mockSessions | planStudy + backend persistence | YES | P0 | render planStudy, persist plans |
| BE | Mastery derivation | PARTIAL | runtime `{"mastery":[]}` after LESSON_COMPLETED | derive mastery from events | YES | P0 | compute mastery in event pipeline |
| AI | Real provider | SIMULATION | ai-gateway.ts:163 demo; no SDK/keys | backend gateway + provider key + timeouts/fallback/usage | YES | P1 | backend gateway |
| AI | RAG | SIMULATION | course-retrieval.ts keyword; RagChunk unused | embeddings, vector, authz-filtered retrieval | YES (if Ask Course in scope) | P1 | backend ingestion+retrieval |
| FE | Teacher analytics | HARDCODED | TeacherAnalytics.tsx literal arrays | real aggregation endpoint | YES | P1 | backend analytics |
| Security | Audit coverage + lifecycle | PARTIAL/MISSING | auth+learning write AuditLog; no query UI; no retention | lifecycle + audit query | CONDITIONAL | P1 | retention/deletion + audit query |
| Gamification | Backend XP | PARTIAL | engagement.ts idempotent dayKey; Achieve.tsx click-award; utils.ts:71 random streak | server persistence, event-driven | NO | P2 | XP on real events; remove generateStreak |
| E2E | Playwright flow | NOT TESTED (this run) | spec exists; stale report only | green login→lesson→quiz→reload | YES | P0 | run & green after wiring |
| Infra | Deploy/monitoring/backups | MISSING | none in repo | Docker/CI/observability/backups/rollback | **YES** | P1 | minimal deploy + monitoring + backup |

---


---

## 5. LAUNCH BLOCKERS

**CRITICAL**
1. **Frontend does not build** — `src/features/student/pages/Dashboard.tsx` lines 129–134 unbalanced tags. Verify: `npx tsc -b` 0 errors; `npm run build` produces dist.
2. **Learning data never reaches PostgreSQL from the UI** — Quiz.tsx:44 / Exam.tsx:43 localStorage bypass; `api.learning.recordEvent` uncalled. Verify: browser quiz → LearningEvent row; reload + backend restart → data intact.
3. **Quiz/Exam/Planner are demo paths** — Planner.tsx:19 mockSessions; learning-engine.ts:38 random selection; simulateExam slicing. Verify: E2E spec green without localStorage.
4. **Mastery not derived server-side from events** (runtime evidence). Verify: LESSON_COMPLETED → GET /learning/mastery non-empty.

**HIGH**
5. AI demo-only (no provider/backend gateway/keys).
6. RAG keyword-overlap client-side (no embeddings/vector/authz).
7. Teacher analytics hardcoded.
8. No deploy/monitoring/backup/rollback.
9. Playwright critical flow not green in current run.

**MEDIUM/LOW:** dual risk engines; Math.random demo seeds (mastery.ts:292-298, Hub.tsx:49, utils.ts:71); Math.random certificate code + weak hash (trust.ts:25-27); stale `securityAudit()` text; logout deletes all sessions; audit log not queryable; no lifecycle; simulated realtime collab; voice/audio/mind-map stubs.

---

## 6. GATES + ASSESSMENT

- **GATE 1 — PRODUCT COMPLETE: FAIL.** Core loop (lesson→quiz→evidence→mastery→planner→review) not closed against the backend; build broken; analytics hardcoded.
- **GATE 2 — PRODUCTION READY: FAIL.** Build broken; no deploy/monitoring/backups/secrets story; no real AI provider; no lifecycle; partial audit coverage.
- **GATE 3 — LAUNCH READY: FAIL.** Requires Gates 1+2 + green critical E2E + security checks.
- **Componentized assessment:** Backend/Auth/DB/RBAC = real & verified. Frontend engines = real, deterministic, tested, but localStorage-only. UI product layer = largely static/demo. AI/RAG = SIMULATION. Infra = MISSING.

---

## 7. EXACT NEXT IMPLEMENTATION ROADMAP (from current repo only)

- **PHASE 1 — P0 CORE PRODUCT (BUILD + PERSISTENCE)**
  1. Fix `src/features/student/pages/Dashboard.tsx` JSX (close the `<div>` opened at line 129 before `</Card>` at 134). Verify: `npx tsc -b` → 0 errors; `npm run build` succeeds.
  2. Replace Quiz.tsx:44 / Exam.tsx:43 `lastQuizScore` with `api.learning.recordEvent` (QUESTION_ANSWERED / QUIZ_SUBMITTED / EXAM_SUBMITTED, clientKey per attempt item); Results.tsx loads from `GET /learning/events` + `/learning/mastery`.
  3. Planner.tsx: render `planStudy()` output; persist via plans endpoints; reload-proof.
- **PHASE 2 — P1 LEARNING INTELLIGENCE**
  4. Server-side mastery derivation inside `POST /learning/events` (update MasteryState from evidence) so `GET /learning/mastery` becomes non-empty. Files: `server/src/routes/learning.ts`, `server/src/services/*`.
  5. Route Quiz through `adaptiveQuizEngine` (createAdaptiveSession/nextQuestion/processAnswer); retire the random path (learning-engine.ts:38) from UI.
  6. Consolidate risk on `risk-engine.ts`; rewire Care.tsx; retire `trust.risk`.
  7. Wire spaced repetition to `REVIEW_COMPLETED` events.
- **PHASE 3 — P1 SECURITY**
  8. Per-session logout (delete by token/session id, not `deleteMany` all); admin-only audit-log query endpoint; retention/account-deletion endpoints; require `JWT_SECRET` in production env.
- **PHASE 4 — P1 AI/RAG**
  9. Backend AI gateway: OpenAI-compatible adapter, env key, timeouts, one retry, usage/cost logging, graceful fallback; persist conversations (AiConversation/AiMessage). Frontend demo only when backend unreachable.
  10. RAG: backend ingestion→chunk→embed→store→authorization-filtered retrieval→cited answer.
- **PHASE 5 — P2 PRODUCT FEATURES**
  11. Teacher analytics from backend aggregation; Achieve.tsx event-driven XP; delete demo seeders (mastery.ts seedDemoData, Hub.tsx seed, utils.generateStreak).
- **PHASE 6 — TESTING:** run `tests/e2e/learning-persistence.spec.ts` on the wired app; add quiz→reload→mastery assertions; keep 106+16 unit tests green.
- **PHASE 7 — PRODUCTION HARDENING:** env config, logging, error tracking, backups, rollback note, dependency audit.
- **PHASE 8 — DEPLOYMENT:** container + managed PostgreSQL + HTTPS + CI.
- **PHASE 9 — FINAL LAUNCH VERIFICATION:** re-run all gates; sign off only with evidence.

## 8. WHAT DOES **NOT** NEED TO BE DONE BEFORE LAUNCH
ML training (no real data); real sandbox isolation (BLOCKED); WebSocket collaboration; real voice/audio-notes/mind-map providers; Parent/Institution full products (out of confirmed scope); certificates (post-launch unless marketed); PWA offline queue (post-launch); advanced retention beyond basic account deletion.

---

## 9. FINAL VERDICT

**LEARNPILOT — FINAL READINESS ASSESSMENT**

- **PRODUCT COMPLETE: NO**
- **PRODUCTION READY: NO**
- **LAUNCH READY: NO**

**Preventing completion:** 1) UI→backend learning wiring absent (localStorage/demo bypasses); 2) quiz/exam/planner demo paths; 3) frontend build broken; 4) mastery not derived from events; 5) analytics/AI/RAG not real.

**Preventing production readiness:** 1) build broken; 2) no monitoring/logging/backups/deploy; 3) no real AI provider; 4) no data lifecycle; 5) audit-log coverage/query gaps.

**Preventing launch:** all of the above + Playwright critical flow not green in current run + no deployment/rollback evidence.

**Next exact steps:** (1) fix Dashboard.tsx JSX → build green; (2) wire Quiz/Exam/Results/Planner to `api.learning.*` with clientKey; (3) derive mastery server-side from events; (4) green the Playwright persistence spec.

**PRODUCT COMPLETE — NO**
**LAUNCH READY — NO**
