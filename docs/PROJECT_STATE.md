# LearnPilot — حالة المشروع (محدث 2026-09-14)

> هذه الوثيقة المصدر الوحيد المعتمد لحالة المشروع. التقارير القديمة مؤرشفة في `docs/archive/` (كثيرة منها متضاربة وقديمة).

## ما تم إنجازه

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

## البنية الحالية (باختصار)
- **فرونت:** React 19 + Vite + Tailwind + i18n (عربي/إنجليزي RTL). ~15 صفحة في `src/features/` + 20 محرك deterministic في `src/shared/intelligence/`.
- **باك:** Express + Prisma + PostgreSQL (Docker: `learnpilot-postgres`). 14 راوت في `server/src/routes/`.
- **AI:** سلسلة مزودين مجانيين في `server/src/routes/ai.ts` (Groq 120B → OpenRouter → Cerebras → Mistral → DeepInfra → HF → GitHub → Gemini → Ollama → demo) + دعم `CUSTOM_LLM_BASE_URL` لسيرفر GPU خارجي.

## الخطوات القادمة المقترحة
1. **تدوير مفاتيح API** (المالك فقط).
2. **اختبار E2E بمتصفح حقيقي** (`tests/e2e/` Playwright: learning-persistence, roles).
3. **تفعيل Ollama المحلي** كـ fallback (`OLLAMA_ENABLED=true` + تحميل `qwen2.5:3b`).
4. **RAG حقيقي**: جدول `RagChunk` موجود وغير مستخدم؛ يحتاج embeddings + ingestion + استرجاع مفلتر.

## سكربتات مساعدة (scripts/debug/)
- `db-check.cjs` — فحص حي للداتابيز (عدّادات أساسية).
- `prisma-validate.cjs` / `prisma-diff.cjs` — فحص المخطط والـ shadow diff.
- `migrate-status.cjs` / `tables.cjs` — حالة الميجريشنز والجداول.
- `start-server-bg.cjs` — تشغيل السيرفر في الخلفية مع تحميل `server/.env`.
- `fix-bom.cjs` / `schema-inspect.cjs` — أدوات صيانة الميجريشنز/المخطط.
