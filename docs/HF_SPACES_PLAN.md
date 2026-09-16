# LearnPilot — خطة الـ Two-Space المجانية (بدون فيزا)
# Space-1 (حساب 1): qwen2.5:7b — الأسرع — خانة custom (أولوية 1)
# Space-2 (حساب 2): qwen3:8b  — الأقوى عربيا — خانة custom-2 (أولوية 2)
#
# صفر تحميل على جهازك: السيرفر هو الذي يسحب الموديل وقت البناء/التشغيل.
# الملفات الجاهزة: spaces/ollama-hf/ (Dockerfile + gate.js + entrypoint.sh + README.md)

## 1) الكود (تم تنفيذه)
- `server/src/routes/ai.ts`: خانة `custom-2` (CUSTOM_LLM_2_BASE_URL/MODEL/API_KEY) بعد `custom` مباشرة + ظهورها في GET /status كـ custom2.
- `server/.env.example`: مثال Space-1 وSpace-2.

## 2) إنشاء الـ Spaces (يدوي — من المتصفح، تصفح عادي فقط)
لكل حساب (كرر مرتين بقيم مختلفة):
1. سجّل دخول Hugging Face → New Space → النوع Docker → اسم مثل learnpilot-7b.
2. ارفع محتويات `spaces/ollama-hf/` (نفس الملفات في الـ Spaceين).
3. Hardware: CPU Basic (مجاني). App port: 7860.
4. المتغيرات:
   - Space-1: Build arg ‏OLLAMA_MODEL=qwen2.5:7b‏ + Secret ‏GATE_TOKEN=<token-1>‏
   - Space-2: Build arg ‏OLLAMA_MODEL=qwen3:8b‏ + Secret ‏GATE_TOKEN=<token-2>‏
   (ولّد كل توكن بأمر: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
5. انتظر اكتمال البناء وسجّل الرابط: https://<user>-<space>.hf.space

## 3) التوصيل (server/.env — غير متتبع في Git)
CUSTOM_LLM_BASE_URL=https://<space-1>.hf.space/v1
CUSTOM_LLM_MODEL=qwen2.5:7b
CUSTOM_LLM_API_KEY=<token-1>
CUSTOM_LLM_2_BASE_URL=https://<space-2>.hf.space/v1
CUSTOM_LLM_2_MODEL=qwen3:8b
CUSTOM_LLM_2_API_KEY=<token-2>
ثم أعد تشغيل السيرفر/الحاوية.

## 4) التحقق (قبل الاعتماد)
node scripts/debug/remote-llm-check.cjs https://<space-1>.hf.space qwen2.5:7b --token=<token-1> --quick
node scripts/debug/remote-llm-check.cjs https://<space-1>.hf.space qwen2.5:7b --token=<token-1>
node scripts/debug/remote-llm-check.cjs https://<space-2>.hf.space qwen3:8b  --token=<token-2> --quick
node scripts/debug/remote-llm-check.cjs https://<space-2>.hf.space qwen3:8b  --token=<token-2>
# معيار القبول: كل Space يرد بتوليد حقيقي ≥ ~8 tok/s.
# ثم: GET /api/v1/ai/status (بعد تسجيل الدخول) — custom وcustom2 ظاهرتان وقابلتان للوصول.

## 5) ملاحظات تشغيل
- الـ Spaces تنام مع الخمول؛ أول طلب بعد النوم ≈ دقيقة صحيان. السلسلة تتجاوزه تلقائيا للتالي.
- OLLAMA_ENABLED=true يبقي الـ 3b المحلي كآخر خط دفاع (أو false لتعطيله).
- لا تطبع التوكن في اللوجات أبدا. دوّر التوكنز دوريا (Secret في الـ Space + .env + إعادة تشغيل).
- ملاحظة سياسة: حسابان لنفس الشخص للالتفاف على حدود المجاني منطقة رمادية في شروط HF.
