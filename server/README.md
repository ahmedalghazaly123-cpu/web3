# LearnPilot Backend Foundation

## الوصف / Description
خادم LearnPilot الفعلي باستخدام Node.js و TypeScript و Express و Prisma و PostgreSQL.
Real LearnPilot backend server using Node.js, TypeScript, Express, Prisma, and PostgreSQL.

## البنية / Architecture
```
Frontend (React)
   │
   ▼
API Client (src/shared/services/api.ts)
   │
   ▼
HTTP API (Express)
   │
   ├── Authentication (/api/v1/auth)
   ├── Users (/api/v1/users)
   ├── Learning (/api/v1/learning)
   └── Health (/health, /ready)
          │
          ▼
      Services
          │
          ▼
     Repositories
          │
          ▼
      PostgreSQL (Prisma ORM)
```

## المتطلبات / Prerequisites
- Node.js >= 18
- PostgreSQL >= 14 (أو Docker)
- npm

## الإعداد / Setup

### 1. تثبيت الاعتماديات / Install Dependencies
```bash
cd server
npm install
```

### 2. إعداد قاعدة البيانات / Database Setup
```bash
# إذا كان PostgreSQL مثبتاً محلياً / If PostgreSQL is installed locally:
createdb learnpilot

# أو باستخدام Docker / Or using Docker:
docker run -d --name learnpilot-postgres \
  -e POSTGRES_USER=learnpilot \
  -e POSTGRES_PASSWORD=learnpilot \
  -e POSTGRES_DB=learnpilot \
  -p 5432:5432 postgres:15
```

### 3. إعداد المتغيرات / Environment Variables
```bash
cp .env.example .env
# عدّل DATABASE_URL في .env
# Edit DATABASE_URL in .env
```

### 4. تشغيل الترحيلات / Run Migrations
```bash
npm run db:push
```

### 5. تشغيل البذرة / Run Seed
```bash
npm run db:seed
```

### 6. تشغيل الخادم / Start Server
```bash
npm run dev
```

الخادم يعمل على http://localhost:4000
Server runs on http://localhost:4000

## الحسابات التجريبية / Demo Accounts
| الدور / Role | البريد / Email | كلمة المرور / Password |
|--------------|----------------|------------------------|
| Student | student@learnpilot.dev | learnpilot |
| Teacher | teacher@learnpilot.dev | learnpilot |
| Admin | admin@learnpilot.dev | learnpilot |
| Owner | owner@learnpilot.dev | learnpilot |

## النقاط endpoints / API Endpoints

### Authentication
- POST /api/v1/auth/signup - تسجيل حساب جديد
- POST /api/v1/auth/login - تسجيل الدخول
- POST /api/v1/auth/logout - تسجيل الخروج
- GET /api/v1/auth/me - المستخدم الحالي

### Users
- GET /api/v1/users/me - بيانات المستخدم الحالي
- GET /api/v1/users/:id - بيانات مستخدم محدد (admin/owner فقط)

### Learning
- POST /api/v1/learning/events - تسجيل حدث تعليمي
- GET /api/v1/learning/events - قائمة الأحداث
- POST /api/v1/learning/mastery - حفظ/تحديث إتقان
- GET /api/v1/learning/mastery - قائمة سجلات الإتقان
- GET /api/v1/learning/progress - ملخص التقدم

### Health
- GET /health - حالة الخادم
- GET /ready - جاهزية قاعدة البيانات

## الأمان / Security
- كلمات المرور مشفرة بـ bcrypt
- جلسات تنتهي تلقائياً بعد 7 أيام
- حماية CORS و Helmet
- Rate limiting
- فصل البيانات (Data Isolation): الطالب لا يستطيع الوصول لبيانات طالب آخر

## الترحيل / Migration
الترحيل من localStorage إلى PostgreSQL يتم تدريجياً عبر API Client الجديد. المتاجر المحلية تظل تعمل كاحتياطي أثناء الترحيل.
Migration from localStorage to PostgreSQL is gradual via the new API Client. Local stores remain as fallback during migration.

## الاختبارات / Tests
```bash
npm test
```

## الملاحظات / Notes
- لا توجد بيانات وهمية (fake) - PostgreSQL حقيقية
- جميع كلمات المرور مشفرة
- الأدوار مفصولة: Student, Teacher, Admin, Owner, Parent
- البذرة تعمل فقط على PostgreSQL الفعلي
