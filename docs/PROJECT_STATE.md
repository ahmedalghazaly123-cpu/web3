# LearnPilot — حالة المشروع (محدث 2026-09-15)

> هذه الوثيقة المصدر الوحيد المعتمد لحالة المشروع. التقارير القديمة مؤرشفة في `docs/archive/` (كثيرة منها متضاربة وقديمة).

## Docker: المشروع حي (2026-09-15)

المشروع موجود في Docker وشغال كـ **compose project `web3` — running(3)**:

| الحاوية | الصورة | المنفذ | الحالة |
|---|---|---|---|
| `learnpilot-postgres` | `postgres:16-alpine` | `5432` | ✅ healthy |
| `learnpilot-server` | `web3-server` (مبنية من `server/`) | `4000` | ✅ يعمل |
| `learnpilot-web` | `web3-client` (مبنية من الجذر + nginx) | `3000` | ✅ يعمل |

- الأوامر: `docker compose up -d --build` للتشغيل، `docker compose ps -a` للحالة، `docker compose logs -f server` للسجلات.
- الباك والداتا مربوطان: السيرفر يتصل بـ `postgres:5432` داخل الشبكة، والـ healthchecks خضراء (`/health`, `/ready`).
- الفحص الشامل: `node scripts/debug/deploy-check.cjs` → **7/7** ✅ (SPA + deep-link + nginx→API proxy + bundle + ollama + AI chain + courses).
- الفحص الحي للـ API: `node scripts/debug/live-check.cjs` → **34/34** ✅ (sandbox/voice/collab/auth/guards + توليد AI إنجليزي/عربي).

### إصلاحات 2026-09-15

1. **الساندبوكس قبل `process.exit(1)`** — `validateInput` كانت بلا قوائم منع ساكنة. الآن `JS_DENY_LIST`/`PY_DENY_LIST` (defence in depth فوق عزل `node:vm`): رفض قبل التنفيذ مع سبب واضح. الاختبارات 24/24 ✅.
2. **نفس-المنشأ للـ API في Docker** — الباندل كان يخبز `http://localhost:4000/api/v1` (المتصفح يتجاوز nginx). الآن `VITE_API_URL=/api/v1` (في `Dockerfile` + `docker-compose.yml`) والمتصفح يمر عبر nginx proxy.
3. **`.dockerignore` للجذر** — سياق البناء كان يسحب ~120MB لوجات/بلوبات. الآن بضعة MB (بناء أسرع بكثير).
4. **Ollama يعمل من الحاوية** — الموديل `qwen2.5:3b` متحمل (1.93GB)، والسيرفر يراه عبر `host.docker.internal:11434`. التوليد الحقيقي مثبت عبر Groq (120B) الآن، وOllama جاهز كـ fallback.
5. سكربتات جديدة: `deploy-check.cjs`, `live-check.cjs`, `docker-status.cjs`, `ai-generate-check.cjs`, `bundle-scan.cjs`, `ollama-check.cjs`, `docker-bg.cjs`, `run-docker.cjs`, `print-lines.cjs`.

## ما تم إنجازه (سابقا)

### 1) أمان المستودع
- `.gitignore` نُظّف (تكرارات + سطر مكسور). ملفات `.env` غير متتبعة في Git إطلاقا (`git ls-files | grep env` نظيف).
- فحص تاريخ Git (`git log -S`) للتأكد من عدم تسرب مفاتيح API في commits سابقة — لم يوجد تسرب في التاريخ؛ المفاتيح كانت في ملف `.env` غير متتبع فقط.
- ⚠️ **إجراء مطلوب من المالك:** تدوير مفاتيح API (Groq/OpenRouter/Google/GitHub) احتياطا لأنها ظهرت في جلسات عمل.

### 2) نظافة المستودع
- ~30 سكريبت/لوج debug مؤقت من الجذر و`server/` نُقلت إلى `scripts/debug/` ثم حُذف عديم الفائدة؛ بقي فقط المساعدات القابلة لإعادة الاستخدام.
- 13 تقرير تدقيق قديم مؤرشفة في `docs/archive/`.

### 3) قاعدة البيانات (محلول بالكامل)
- **مشكلة:** الميجريشن `20260912000002` كان فاشلا في الـ shadow diff بسبب BOM في أول السطر + 5 enums ناقصة (`AssignmentType`, `AssignmentStatus`, `SubmissionStatus`, `FileCategory`, `FileVisibility`) + الداتابيز كانت مبنية بـ `db push` بدون تاريخ ميجريشنز.
- **الحل:** إزالة BOM، إضافة تعريفات الـ enums للميجريشن، ثم `prisma migrate resolve --applied` للثلاث ميجريشنز (baseline).
- **النتيجة:** `prisma migrate status` = "Database schema is up to date!" ✅
- الداتابيز حية: 770 users، 238 learning_events، كل الجداول موجودة.

### 4) التحقق الحي (كله أخضر)
| الفحص | النتيجة |
|---|---|
| `tsc --noEmit` (فرونت) | ✅ صفر أخطاء |
| `tsc --noEmit` (سيرفر) | ✅ صفر أخطاء |
| `vitest` (فرونت) | ✅ 139/139 |
| `vitest` (سيرفر، ضد سيرفر حي + DB حي) | ✅ 36/36 (auth, RBAC, privacy, retention, validation, learning) |
| `GET /health` | ✅ يعمل |
| `GET /api/v1/ai/status` | ✅ يستجيب (يتطلب auth — طبيعي) |

### 5) lucide-react
- كانت `^1.42.0` (إصدار غير موجود فعليا) → عولج إلى `^0.469.0` وهو المثبت حاليا ويعمل مع tsc وbuild.

### 6) الصوت + الساندبوكس + الغرف (Phases 14 / 32 / 25-26) — مكتملة الآن
كانت هذه الملفات عملا غير مكتمل (كود مقطوع + راوتس غير مسجَّلة + خدمة مفقودة)، وأُكملت:

- **الساندبوكس** (`server/src/services/sandboxService.ts`): كان الملف مقطوعا (ينتهي عند `execute,` بدون تعريف الدالة). أُكمل التنفيذ الحقيقي:
  - JS داخل `node:vm` بسياق مجمَّد (لا `process`/`require`/`fs`) + مهلة صارمة + التقاط `console`.
  - Python عبر عملية فرعية بمهلة (`python` على ويندوز / `python3` غيره، مع `PYTHON_BIN`).
  - إضافة `execute` + `getRun`/`listRuns` مع فرض الملكية، حدود الحجم/المهلة/stdin، تمييز `TIMEOUT` عن `ERROR`، وتسجيل المدة الحقيقية.
- **راوت ساندبوكس جديد** (`server/src/routes/sandbox.ts`): `POST /run`, `POST /validate`, `GET /runs`, `GET /runs/:id` + AuditLog لكل تشغيل. ونُسخ `REJECTED` إلى `BLOCKED` لأن enum في Prisma لا يحتوي REJECTED.
- **الصوت**: راوت `server/src/routes/voice.ts` كان غير مسجَّل في `index.ts`، ويستخدم `req.file` بدون multer، ومسار `/transcript` كان يطلب `sessionId` في الجسم خطأً. الآن: multer للذاكرة (25MB + قائمة MIME صوتية)، `POST /transcribe` و`POST /synthesize`، سجل جلسات `GET /sessions`، وفرض ملكية صارم (كان هناك IDOR: `appendTranscript/appendAnswer/closeSession` لا تتحقق من المالك).
- **الغرف/التعاون**: `server/src/services/collabService.ts` لم يكن موجودا رغم استيراده في `services/index.ts` (كان الكود لا يُصرِّف). الآن خدمة كاملة على PostgreSQL (`LiveRoom`/`RoomMembership`/`RoomMessage`): إنشاء برمز غرفة، انضمام بالرمز، بدء/إنهاء (HOST فقط)، احتساب نقاط من السيرفر، ترتيب نهائي ورسائل chat/system/score لأعضاء الغرفة فقط. + راوت `server/src/routes/collab.ts`.
- **إصلاح خطأ تصريف**: `server/src/services/index.ts` كان فيه `export` داخل جسم كلاس `UserService` (خطأ نحوي) — أُزيل.
- **الترحيل الناقص** `20260915000000_add_voice_sandbox_room_messages`: جداول `voice_sessions`, `voice_messages`, `sandbox_runs`, `room_messages` + الـ enums الخاصة بها كانت في المخطط بلا migration (drift يسبب `relation does not exist` وقت التشغيل).
- **الفرونت**: مجموعات `sandbox`/`voice`/`collab` في `src/shared/services/api.ts`، ومحوّلا `shared/services/sandbox.ts` و`shared/services/voice.ts` (على نمط `learningSync`: الباك إند مرجعي مع بديل محلي/متصفح)، وربط صفحات Hub: Code Lab حقيقي في `Studio.tsx`، وجلسات + STT/TTS من السيرفر مع بديل المتصفح في `Voice.tsx`، وغرف باحتساب سيرفر مع بديل محلي في `Compete.tsx`، مع ترجمات عربي/إنجليزي كاملة، وتحديث `production.ts` (`securityAudit`) ليطابق الواقع.
- **التحقق الحي**: `tsc --noEmit` للسيرفر ✅ (صفر أخطاء)، `tsc -b` للفرونت ✅، فرونت `vitest` 139/139 ✅، سيرفر `vitest` الجديد (`tests/sandbox.test.ts` 13 اختبار + `tests/voice.test.ts` 5 اختبارات) 18/18 ✅، و`oxlint` 0 أخطاء.

### 7) سكربتات فحص مساعدة جديدة (`scripts/debug/`)
- `run-tsc.cjs` — فحص الأنواع للفرونت/السيرفر في الخلفية مع لوج قابل للمتابعة (يتجنب مهلة الأوامر).
- `run-vitest.cjs` — تشغيل اختبارات الفرونت في الخلفية مع لوج.

## البنية الحالية (باختصار)
- **فرونت:** React 19 + Vite + Tailwind + i18n (عربي/إنجليزي RTL). ~15 صفحة في `src/features/` + 20 محرك deterministic في `src/shared/intelligence/`.
- **باك:** Express + Prisma + PostgreSQL (Docker: `learnpilot-postgres`). 17 راوت في `server/src/routes/` (منها الجديد: `voice`, `sandbox`, `collab`).
- **AI:** سلسلة مزودين مجانيين في `server/src/routes/ai.ts` (Groq 120B → OpenRouter → Cerebras → Mistral → DeepInfra → HF → GitHub → Gemini → Ollama → demo) + دعم `CUSTOM_LLM_BASE_URL` لسيرفر GPU خارجي.

## ما يتبقى (تنفيذي)
1. **تدوير مفاتيح API** (المالك فقط) — الإجراء الوحيد المتبقي.

### أُنجز بالكامل 2026-09-15 (التحقق النهائي)
- **E2E بمتصفح حقيقي**: `node scripts/debug/run-e2e.cjs tests/e2e --reporter=line --workers=1` → **13/13** ✅ (auth: تسجيل/دخول/دخول admin/خروج/روابط، learning-persistence: 3 اختبارات، navigation: 2، roles: 3).
  - ملاحظة: التشغيل بـ `--workers=1` ضروري على هذا الجهاز؛ التوازي (2 workers) يسبب فشل في `roles` بسبب تنافس على الموارد لا بسبب الكود — كل اختبار ينجح منفردا.
- **إثبات Ollama كـ fallback من داخل الحاوية**: `scripts/debug/ollama-fallback-proof.cjs` يُنسخ للحاوية ويُشغّل، والنتيجة: `reachable from container: yes (http 200)` + إكمال حقيقي `qwen2.5:3b` (`content: fallback-ok`, 6.4s). هذا يثبت مسار الـ cascade (`OLLAMA_BASE_URL=http://host.docker.internal:11434` + `POST /api/chat`).

## سكربتات مساعدة (scripts/debug/)
- `deploy-check.cjs` — فحص النشر الشامل (SPA + deep-link + nginx proxy + bundle + ollama + AI chain + courses).
- `docker-status.cjs` — الحاويات/الصور/المنافذ + فحوص HTTP + الداتابيز من داخل السيرفر + موديلات Ollama.
- `live-check.cjs` — فحص حي للـ API (auth + sandbox + voice + collab + guards).
- `ai-live-check.cjs` — فحص حي لسلسلة الـ AI + المحادثات المحفوظة + RAG.
- `ai-generate-check.cjs` / `ollama-check.cjs` — توليد AI حقيقي وحالة Ollama.
- `ollama-fallback-proof.cjs` — إثبات الـ fallback من داخل حاوية السيرفر.
- `run-e2e.cjs` / `e2e-preflight.cjs` — تشغيل Playwright في الخلفية + فحص جاهزية البيئة.
- `docker-bg.cjs` / `run-docker.cjs` / `docker-run.cjs` — تشغيل أوامر Docker (خلفية/عادي مع لوج).
- `bundle-scan.cjs` / `bundle-api-check.cjs` — فحص الباندل المخدوم (API base + تسريبات).
- `ai-status.cjs` / `rag-e2e.cjs` / `rag-scout.cjs` / `tts-check.cjs` — فحوص AI/RAG/الصوت.
- `check-playwright.cjs` / `schema-models.cjs` / `ollama-serve.cjs` / `ollama-pull.cjs` — فحوص بيئة/مخطط/تحميل الموديل.
- `print-lines.cjs` — مساعد قراءة نطاق أسطر من ملف/لوج (يتجنب مشاكل quoting في Windows).
- `db-check.cjs` — فحص حي للداتابيز (عدّادات أساسية).
- `prisma-validate.cjs` / `prisma-diff.cjs` — فحص المخطط والـ shadow diff.
- `migrate-status.cjs` / `tables.cjs` — حالة الميجريشنز والجداول.
- `start-server-bg.cjs` — تشغيل السيرفر في الخلفية مع تحميل `server/.env`.
- `fix-bom.cjs` / `schema-inspect.cjs` — أدوات صيانة الميجريشنز/المخطط.
- `run-tsc.cjs` / `run-vitest.cjs` — فحص الأنواع/الاختبارات في الخلفية مع لوج.
- `run-bg.cjs` / `putenv.cjs` / `env-names.cjs` — تشغيل سكربت في الخلفية وأدوات بيئة.
- `verify-all.cjs` — الفحص الشامل الواحد: TSC(2) + vitest(2) + live-check + deploy-check + E2E → ملخص `x/y sections passed`.
- `run-prisma.cjs` — تشغيل أوامر Prisma من الجذر مع تحميل `server/.env`.
- `grep.cjs` / `print-lines.cjs` / `sleep.cjs` — مساعدات قراءة/انتظار (تتجنب مشاكل quoting في Windows).
- `commit.cjs` — تنفيذ `git commit` بتمرير argv مباشرة (يتجنب تمزيق علامات التنصيص في cmd.exe).
- `doc-scripts-check.cjs` — تطابق قائمة السكربتات في هذه الوثيقة مع الواقع على القرص.
