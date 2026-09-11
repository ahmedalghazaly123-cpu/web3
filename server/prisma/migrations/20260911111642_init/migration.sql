-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN', 'OWNER', 'PARENT');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'TEXT', 'PDF', 'INTERACTIVE', 'LIVE');

-- CreateEnum
CREATE TYPE "GraphNodeType" AS ENUM ('COURSE', 'MODULE', 'LESSON', 'CONCEPT', 'SKILL', 'TOPIC', 'QUESTION', 'PREREQUISITE');

-- CreateEnum
CREATE TYPE "EdgeKind" AS ENUM ('PREREQUISITE', 'PART_OF', 'RELATED', 'ASSESSES', 'TEACHES', 'WEAKNESS_LINKED');

-- CreateEnum
CREATE TYPE "MasteryDimension" AS ENUM ('QUIZ', 'EXAM', 'RESPONSE_ACCURACY', 'RESPONSE_TIME', 'REPEATED_MISTAKES', 'REVISION_FREQUENCY', 'COMPLETION', 'LEARNING_CONSISTENCY', 'DIFFICULTY_ADJUSTED');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('QUIZ', 'EXAM', 'PRACTICE', 'AI_TUTOR', 'REVISION', 'SESSION', 'MANUAL', 'STUDENT', 'ASSESSMENT');

-- CreateEnum
CREATE TYPE "MistakeCategory" AS ENUM ('CARELESS', 'CONCEPTUAL', 'CALCULATION', 'PREREQUISITE', 'MISUNDERSTANDING', 'REPEATED', 'RETRIEVAL_FAILURE', 'TIMING');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'SHORT_ANSWER', 'CODE', 'MATH');

-- CreateEnum
CREATE TYPE "CognitiveLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('QUIZ', 'EXAM');

-- CreateEnum
CREATE TYPE "ExamTemplate" AS ENUM ('UNIT_TEST', 'MIDTERM', 'FINAL', 'MOCK_EXAM');

-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('QUIZ', 'EXAM', 'PRACTICE', 'ADAPTIVE', 'AI_TUTOR');

-- CreateEnum
CREATE TYPE "LearningEventKind" AS ENUM ('LESSON_VIEWED', 'LESSON_COMPLETED', 'QUESTION_ANSWERED', 'QUIZ_SUBMITTED', 'EXAM_SUBMITTED', 'REVIEW_COMPLETED', 'MISTAKE_RECORDED', 'CONCEPT_LINKED', 'SESSION_STARTED', 'SESSION_ENDED', 'GOAL_UPDATED');

-- CreateEnum
CREATE TYPE "LearningEventSource" AS ENUM ('STUDENT', 'ASSESSMENT', 'AI_TUTOR', 'PLANNER', 'SPACED_REPETITION', 'CLASSROOM', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PlanItemKind" AS ENUM ('LESSON', 'PRACTICE', 'QUIZ', 'EXAM', 'REVISION', 'REMEDIATION', 'CHALLENGE', 'BREAK');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReviewCardType" AS ENUM ('FLASHCARD', 'QUESTION', 'CONCEPT', 'MISTAKE');

-- CreateEnum
CREATE TYPE "AiMode" AS ENUM ('EXPLAIN', 'HINT', 'SOCRATIC', 'STEP_BY_STEP', 'EXAM_PREP', 'REVISION', 'ERROR_EXPLANATION', 'FULL_SOLUTION', 'GUIDED_SOLUTION', 'ASSIST');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AI');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('GATEWAY_PRIMARY', 'GATEWAY_FALLBACK', 'LOCAL_DEMO');

-- CreateEnum
CREATE TYPE "UsageStatus" AS ENUM ('OK', 'FALLBACK', 'ERROR', 'CACHED');

-- CreateEnum
CREATE TYPE "LiveRoomKind" AS ENUM ('STUDY_ROOM', 'QUIZ_BATTLE', 'CODING_BATTLE');

-- CreateEnum
CREATE TYPE "RoomPrivacy" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'COUNTDOWN', 'RUNNING', 'FINISHED');

-- CreateEnum
CREATE TYPE "RoomRole" AS ENUM ('HOST', 'PARTICIPANT', 'MODERATOR');

-- CreateEnum
CREATE TYPE "CertificateTrigger" AS ENUM ('COURSE_COMPLETION', 'PASSING_EXAM', 'ACHIEVEMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "BookmarkTarget" AS ENUM ('LESSON', 'PARAGRAPH', 'QUESTION', 'AI_EXPLANATION', 'RESOURCE');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RecoveryTrigger" AS ENUM ('MISSED_SESSIONS', 'LOW_SCORES', 'DEADLINE', 'DROPPED_COURSE', 'MANUAL');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'AR');

-- CreateEnum
CREATE TYPE "AiProviderKind" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE', 'CUSTOM', 'DEMO');

-- CreateEnum
CREATE TYPE "ProviderRoute" AS ENUM ('PRIMARY', 'FALLBACK', 'CACHE_ONLY');

-- CreateEnum
CREATE TYPE "Trend" AS ENUM ('IMPROVING', 'STABLE', 'DECLINING');

-- CreateEnum
CREATE TYPE "LearningSpeed" AS ENUM ('SLOWER', 'AVERAGE', 'FASTER');

-- CreateEnum
CREATE TYPE "Consistency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DifficultyTolerance" AS ENUM ('PREFERS_CHALLENGE', 'BALANCED', 'PREFERS_EASIER');

-- CreateEnum
CREATE TYPE "StudyTiming" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "ClassroomStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "organizationId" TEXT,
    "studentProfileId" TEXT,
    "teacherProfileId" TEXT,
    "parentProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grade" TEXT,
    "interests" TEXT[],
    "learningProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_links" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "slug" TEXT NOT NULL,
    "tiers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "instructorId" TEXT NOT NULL,
    "instructorName" TEXT NOT NULL,
    "instructorNameAr" TEXT,
    "instructorAvatar" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryAr" TEXT,
    "cover" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "totalLessons" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "description" TEXT,
    "type" "LessonType" NOT NULL DEFAULT 'VIDEO',
    "durationMinutes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_nodes" (
    "id" TEXT NOT NULL,
    "type" "GraphNodeType" NOT NULL,
    "label" TEXT NOT NULL,
    "labelAr" TEXT,
    "courseId" TEXT,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "topic" TEXT,
    "skillId" TEXT,
    "difficulty" INTEGER,
    "masteryBaseline" INTEGER DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_edges" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "kind" "EdgeKind" NOT NULL,
    "weight" DOUBLE PRECISION DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastery_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" "GraphNodeType" NOT NULL,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "dimensions" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3) NOT NULL,
    "nextReviewAt" TIMESTAMP(3),
    "confidence" INTEGER DEFAULT 0,
    "trend" "Trend",
    "weak" BOOLEAN NOT NULL DEFAULT false,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEvidenceNote" TEXT,

    CONSTRAINT "mastery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mastery_evidence" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" "GraphNodeType" NOT NULL,
    "dimension" "MasteryDimension" NOT NULL,
    "value" INTEGER NOT NULL,
    "source" "EvidenceSource" NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mastery_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistakes" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT,
    "lessonId" TEXT,
    "courseId" TEXT,
    "topic" TEXT NOT NULL,
    "topicAr" TEXT,
    "category" "MistakeCategory" NOT NULL,
    "question" TEXT NOT NULL,
    "studentAnswer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "explanationAr" TEXT,
    "difficulty" INTEGER NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "repetitionCount" INTEGER NOT NULL DEFAULT 1,
    "relatedConceptIds" TEXT[],
    "relatedMistakeIds" TEXT[],
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "severity" "Severity",
    "signals" JSONB,
    "explanationWhy" TEXT,
    "recoveredAt" TIMESTAMP(3),
    "intervention" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mistakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "topic" TEXT NOT NULL,
    "topicAr" TEXT,
    "skillId" TEXT,
    "conceptId" TEXT,
    "type" "QuestionType" NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "bodyAr" TEXT,
    "options" TEXT[],
    "correctOptionIndex" INTEGER,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "explanationAr" TEXT,
    "sourceLessonId" TEXT,
    "sourceMaterial" TEXT,
    "tags" TEXT[],
    "cognitiveLevel" "CognitiveLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "type" "AssessmentType" NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "questionIds" TEXT[],
    "timeLimitSeconds" INTEGER,
    "passingScore" INTEGER NOT NULL,
    "randomized" BOOLEAN NOT NULL DEFAULT false,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
    "adaptive" BOOLEAN NOT NULL DEFAULT false,
    "template" "ExamTemplate",
    "topicCoverage" JSONB,
    "difficultyDistribution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "selectedAnswer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "timeSpentSeconds" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL,
    "mode" "AttemptMode",
    "mistakeId" TEXT,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_events" (
    "id" TEXT NOT NULL,
    "kind" "LearningEventKind" NOT NULL,
    "studentId" TEXT NOT NULL,
    "source" "LearningEventSource" NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "nodeId" TEXT,
    "nodeType" "GraphNodeType",
    "courseId" TEXT,
    "lessonId" TEXT,
    "questionId" TEXT,
    "sessionId" TEXT,
    "assessmentId" TEXT,
    "payload" JSONB,
    "clientKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planItemId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "intendedMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER,
    "topic" TEXT NOT NULL,
    "courseId" TEXT,
    "focusGoal" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "interruptCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_items" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "PlanItemKind" NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "topic" TEXT,
    "estimatedMinutes" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_cards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nodeId" TEXT,
    "questionId" TEXT,
    "mistakeId" TEXT,
    "type" "ReviewCardType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptAr" TEXT,
    "answer" TEXT NOT NULL,
    "answerAr" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "quality" INTEGER,
    "sourceLessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_levels" (
    "studentId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xpToNext" INTEGER NOT NULL DEFAULT 100,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_levels_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "mode" "AiMode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "studentId" TEXT,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "mode" "AiMode",
    "citations" TEXT[],
    "sourceLessonId" TEXT,
    "sourceMaterial" TEXT,
    "model" TEXT,
    "latencyMs" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "safetyPassed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "courseId" TEXT,
    "feature" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "status" "UsageStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_rooms" (
    "id" TEXT NOT NULL,
    "kind" "LiveRoomKind" NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "privacy" "RoomPrivacy" NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "courseId" TEXT,
    "language" "Language",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "settings" JSONB,

    CONSTRAINT "live_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_memberships" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomRole" NOT NULL DEFAULT 'PARTICIPANT',
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "score" INTEGER,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER,
    "trigger" "CertificateTrigger" NOT NULL,
    "issuerId" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "hash" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "targetType" "BookmarkTarget" NOT NULL,
    "targetId" TEXT,
    "url" TEXT,
    "excerpt" TEXT,
    "note" TEXT,
    "noteAr" TEXT,
    "tags" TEXT[],
    "reminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_goals" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "targetSkillIds" TEXT[],
    "targetLessonIds" TEXT[],
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_plans" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "trigger" "RecoveryTrigger" NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "summaryAr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "totalQuestions" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "timeUsedSeconds" INTEGER,
    "questionResults" JSONB,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_dna" (
    "studentId" TEXT NOT NULL,
    "learningSpeed" "LearningSpeed" NOT NULL,
    "preferredContentType" TEXT[],
    "strongestSubjects" TEXT[],
    "weakSubjects" TEXT[],
    "consistency" "Consistency" NOT NULL,
    "difficultyTolerance" "DifficultyTolerance" NOT NULL,
    "mistakePatterns" "MistakeCategory"[],
    "studyTiming" "StudyTiming"[],
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_dna_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "parent_progress_snapshots" (
    "studentId" TEXT NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionPercent" DOUBLE PRECISION,
    "studyHoursThisWeek" DOUBLE PRECISION,
    "studyHoursTotal" DOUBLE PRECISION,
    "courseProgress" JSONB,
    "weakAreas" JSONB,
    "upcomingExams" JSONB,
    "streak" INTEGER,
    "recentAchievements" TEXT[],
    "alerts" JSONB,

    CONSTRAINT "parent_progress_snapshots_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "attention_snapshots" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "signals" JSONB NOT NULL,
    "sampledAt" TIMESTAMP(3) NOT NULL,
    "cameraConsent" BOOLEAN,
    "needsAttention" BOOLEAN,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attention_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "kind" "AiProviderKind" NOT NULL,
    "baseUrl" TEXT,
    "model" TEXT,
    "defaultTimeoutMs" INTEGER,
    "maxTokens" INTEGER,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "route" "ProviderRoute" NOT NULL DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_gateway_policies" (
    "id" TEXT NOT NULL,
    "defaultProviderId" TEXT NOT NULL,
    "fallbackChainIds" TEXT[],
    "semanticCacheEnabled" BOOLEAN NOT NULL DEFAULT true,
    "budgetUsdMonthly" DOUBLE PRECISION,
    "budgetAlertThreshold" INTEGER DEFAULT 80,
    "rateLimitRequestsPerMinute" INTEGER DEFAULT 60,
    "piiRedactionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "unsafeBlockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "academicIntegrityDefaultMode" "AiMode" NOT NULL DEFAULT 'ASSIST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_gateway_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "roles" TEXT[],
    "minEnv" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "classroomId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progressPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "courseId" TEXT,
    "status" "ClassroomStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_profiles_userId_key" ON "teacher_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "parent_links_parentUserId_studentUserId_key" ON "parent_links"("parentUserId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_edges_sourceId_targetId_kind_key" ON "knowledge_edges"("sourceId", "targetId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "mastery_records_studentId_nodeId_key" ON "mastery_records"("studentId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessmentId_questionId_key" ON "assessment_questions"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "learning_events_studentId_kind_idx" ON "learning_events"("studentId", "kind");

-- CreateIndex
CREATE INDEX "learning_events_studentId_happenedAt_idx" ON "learning_events"("studentId", "happenedAt");

-- CreateIndex
CREATE INDEX "plan_items_studentId_scheduledFor_idx" ON "plan_items"("studentId", "scheduledFor");

-- CreateIndex
CREATE INDEX "review_cards_studentId_nextReviewAt_idx" ON "review_cards"("studentId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "ai_usage_studentId_happenedAt_idx" ON "ai_usage"("studentId", "happenedAt");

-- CreateIndex
CREATE UNIQUE INDEX "room_memberships_roomId_userId_key" ON "room_memberships"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verificationCode_key" ON "certificates"("verificationCode");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "knowledge_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mastery_records" ADD CONSTRAINT "mastery_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_levels" ADD CONSTRAINT "student_levels_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_rooms" ADD CONSTRAINT "live_rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "live_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_plans" ADD CONSTRAINT "recovery_plans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_dna" ADD CONSTRAINT "learning_dna_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_progress_snapshots" ADD CONSTRAINT "parent_progress_snapshots_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attention_snapshots" ADD CONSTRAINT "attention_snapshots_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
