// ━━━─ LearnPilot Shared Domain Models ━━━─
// Backend-ready shapes. Demo implementations live in @shared/services/*.
// These types are the single source of truth for the learning-intelligence
// ecosystem so every feature shares one coherent data model.

// ─── identifiers ──────────────────────────────────────────────────────────────

/** Stable opaque id. Backend will use UUIDs; frontend may use string/number temporarily. */
export type EntityId = string;

// ─── users / roles / organizations ────────────────────────────────────────────

export type PlatformRole =
  | 'owner'
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent';

export interface PlatformUser {
  id: EntityId;
  role: PlatformRole;
  name: string;
  email: string;
  locale: 'en' | 'ar';
  timezone: string;
  createdAt: string; // ISO
  // derived / optional
  organizationId?: EntityId;
  studentProfileId?: EntityId;
  teacherProfileId?: EntityId;
  parentProfileId?: EntityId;
}

export interface StudentProfile {
  id: EntityId;
  userId: EntityId;
  grade?: string;
  interests?: string[]; // free tags, e.g. ['math', 'computer-science']
  learningProfileId?: EntityId;
}

export interface ParentLink {
  id: EntityId;
  parentUserId: EntityId;
  studentUserId: EntityId;
  status: 'pending' | 'active' | 'revoked';
  createdAt: string;
}

// ─── catalog ──────────────────────────────────────────────────────────────────

export interface Organization {
  id: EntityId;
  name: string;
  nameAr?: string;
  slug: string;
  tiers?: string[];
}

export interface Course {
  id: EntityId;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  instructorId: EntityId;
  instructorName: string;
  instructorNameAr?: string;
  instructorAvatar: string;
  category: string;
  categoryAr?: string;
  cover: string;
  color: string;
  durationMinutes: number;
  totalLessons: number;
  published: boolean;
  // computed later by services
  progressPercent?: number;
}

export interface Module {
  id: EntityId;
  courseId: EntityId;
  title: string;
  titleAr?: string;
  order: number;
}

export interface Lesson {
  id: EntityId;
  moduleId: EntityId;
  courseId: EntityId;
  title: string;
  titleAr?: string;
  description?: string;
  type: 'video' | 'text' | 'pdf' | 'interactive' | 'live';
  durationMinutes: number;
  order: number;
  content?: string; // HTML / markdown for text lessons (used by Ask Your Course, semantic search, mind maps)
  locked: boolean;
}

// ─── knowledge graph ──────────────────────────────────────────────────────────

export type GraphNodeType =
  | 'course'
  | 'module'
  | 'lesson'
  | 'concept'
  | 'skill'
  | 'topic'
  | 'question'
  | 'prerequisite';

export interface GraphNode {
  id: EntityId;
  type: GraphNodeType;
  label: string;
  labelAr?: string;
  // optional rich payload
  courseId?: EntityId;
  moduleId?: EntityId;
  lessonId?: EntityId;
  topic?: string;
  skillId?: EntityId;
  difficulty?: number; // 1-5
  masteryBaseline?: number; // expected mastery to proceed
}

export interface GraphEdge {
  id: EntityId;
  source: EntityId;
  target: EntityId;
  kind: 'prerequisite' | 'part-of' | 'related' | 'assesses' | 'teaches' | 'weakness-linked';
  weight?: number; // for prerequisite strength
}
// ─── skills & prerequisites ───────────────────────────────────────────────────

export interface Skill {
  id: EntityId;
  name: string;
  nameAr?: string;
  category?: string;
  relatedConceptIds?: EntityId[];
}

export interface PrerequisiteRule {
  id: EntityId;
  targetLessonId: EntityId;
  requiredSkillId?: EntityId;
  requiredConceptId?: EntityId;
  minMastery?: number; // 0-100
  autoInsertLessonId?: EntityId; // recommended prerequisite lesson to insert
  explanation: string; // why this prerequisite matters
  explanationAr?: string;
}

// ─── mastery ──────────────────────────────────────────────────────────────────

export type MasteryDimension =
  | 'quiz'
  | 'exam'
  | 'responseAccuracy'
  | 'responseTime'
  | 'repeatedMistakes'
  | 'revisionFrequency'
  | 'completion'
  | 'learningConsistency'
  | 'difficultyAdjusted';

export interface MasteryEvidence {
  id: EntityId;
  studentId: EntityId;
  nodeId: EntityId; // concept/lesson/skill/topic
  nodeType: GraphNodeType;
  dimension: MasteryDimension;
  value: number; // normalized 0-100 where applicable
  source: 'quiz' | 'exam' | 'practice' | 'ai-tutor' | 'revision' | 'session' | 'manual' | 'student' | 'assessment';
  happenedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MasteryRecord {
  id: EntityId;
  studentId: EntityId;
  nodeId: EntityId;
  nodeType: GraphNodeType;
  // primary mastery 0-100 (aggregate, not simple average)
  mastery: number;
  // optional per-dimension breakdown
  dimensions?: Partial<Record<MasteryDimension, number>>;
  attempts: number;
  lastPracticedAt: string;
  nextReviewAt?: string; // spaced repetition
  confidence?: number; // 0-100
  // trends
  trend?: 'improving' | 'stable' | 'declining';
  weak?: boolean;
  mastered?: boolean;
  updatedAt: string;
  /** Explainability trail: how the last evidence observation moved mastery. */
  lastEvidenceNote?: string;
}

// ─── mistakes ─────────────────────────────────────────────────────────────────

/**
 * Full mistake taxonomy (Phase 4 — Misconception Intelligence):
 *  - careless: rushed answer (fast response, low difficulty)
 *  - conceptual: wrong mental model on harder material
 *  - calculation: process/slip error on routine material
 *  - prerequisite: failure attributable to an unmet prerequisite
 *  - misunderstanding: misread/misinterpreted the question or content
 *  - repeated: recurring misconception on the same concept (strong signal)
 *  - retrieval-failure: previously-mastered knowledge not recalled
 *  - timing: problem-solving/pace issue (far too slow), not a knowledge gap
 */
export type MistakeCategory =
  | 'careless'
  | 'conceptual'
  | 'calculation'
  | 'prerequisite'
  | 'misunderstanding'
  | 'repeated'
  | 'retrieval-failure'
  | 'timing';

export interface MistakeEntry {
  id: EntityId;
  studentId: EntityId;
  questionId?: EntityId;
  lessonId?: EntityId;
  courseId?: EntityId;
  topic: string;
  topicAr?: string;
  category: MistakeCategory;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  explanationAr?: string;
  difficulty: number; // 1-5
  // tracking
  firstSeenAt: string;
  lastSeenAt: string;
  repetitionCount: number;
  relatedConceptIds?: EntityId[];
  relatedMistakeIds?: EntityId[];
  resolved?: boolean;
  // Phase 4 — misconception intelligence (all optional: backward compatible)
  severity?: 'low' | 'medium' | 'high';
  signals?: Partial<Record<string, number | boolean | string>>; // structured evidence
  explanationWhy?: string; // why this classification (deterministic rule trace)
  recoveredAt?: string; // when the student later answered the same question correctly
  intervention?: { kind: 'ai-tutor' | 'review' | 'lesson' | 'planner'; at: string }[]; // interventions applied before recovery
}

// ─── questions & assessments ──────────────────────────────────────────────────

export type QuestionType = 'multiple-choice' | 'multiple-select' | 'short-answer' | 'code' | 'math';

export interface Question {
  id: EntityId;
  courseId?: EntityId;
  lessonId?: EntityId;
  topic: string;
  topicAr?: string;
  skillId?: EntityId;
  conceptId?: EntityId;
  type: QuestionType;
  difficulty: number; // 1-5
  body: string;
  bodyAr?: string;
  // MC
  options?: string[];
  correctOptionIndex?: number;
  // answers
  correctAnswer: string; // normalized for auto-grading / display
  explanation: string;
  explanationAr?: string;
  // metadata
  sourceLessonId?: EntityId;
  sourceMaterial?: string;
  tags?: string[];
  cognitiveLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate';
}

export interface QuestionAttempt {
  id: EntityId;
  studentId: EntityId;
  questionId: EntityId;
  sessionId?: EntityId;
  selectedAnswer: string;
  correct: boolean;
  timeSpentSeconds: number;
  answeredAt: string;
  mode?: 'quiz' | 'exam' | 'practice' | 'adaptive' | 'ai-tutor';
  mistakeId?: EntityId;
}

export interface Assessment {
  id: EntityId;
  title: string;
  titleAr?: string;
  type: 'quiz' | 'exam';
  courseId?: EntityId;
  lessonId?: EntityId;
  questionIds: EntityId[];
  timeLimitSeconds?: number;
  passingScore: number; // 0-100
  randomized?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  adaptive?: boolean; // adaptive quiz engine
  // exam simulator metadata
  template?: 'unit-test' | 'midterm' | 'final' | 'mock-exam';
  topicCoverage?: Record<string, number>; // topic -> target %
  difficultyDistribution?: Record<string, number>;
}

// ─── adaptive quiz engine (Phase 7) ──────────────────────────────────────────

/** Learning state for a node — determines question selection strategy. */
export type LearningState =
  | 'FOUNDATION'    // new concept, no evidence
  | 'REMEDIATION'   // significant gaps detected
  | 'PRACTICE'      // building fluency
  | 'MASTERY'       // high mastery, maintenance
  | 'CHALLENGE'     // above-mastery stretch
  | 'REVIEW';       // spaced-repetition review

export interface AdaptiveQuizConfig {
  studentId: EntityId;
  /** Target node (concept/skill). If omitted, engine picks the weakest tracked node. */
  targetNodeId?: EntityId;
  nodeType?: GraphNodeType;
  courseId?: EntityId;
  topic?: string;
  /** Max questions before the session ends. */
  maxQuestions: number;
  /** Minimum correct streak to advance difficulty. */
  advanceStreak: number;
  /** Consecutive wrong answers that trigger a stop/remediation. */
  maxConsecutiveWrong: number;
  /** Whether to prefer review cards over new questions. */
  reviewMode: boolean;
  /** Now timestamp (ISO) — input for determinism. */
  nowIso: string;
}

export interface AdaptiveQuizQuestion {
  question: Question;
  /** Why this question was selected (explainability). */
  selectionReason: string;
  /** Learning state that drove selection. */
  state: LearningState;
  /** 1-5 — the difficulty the engine is targeting. */
  targetDifficulty: number;
  /** True if this question reviews a past mistake. */
  isReview: boolean;
}

export interface AdaptiveQuizAnswerResult {
  correct: boolean;
  /** Updated mastery record after projection. */
  record: MasteryRecord | undefined;
  /** Next learning state after this answer. */
  newState: LearningState;
  /** Recommended next difficulty (1-5). */
  nextDifficulty: number;
  /** True if the session should stop (remediation needed / mastery achieved / too many wrong). */
  shouldStop: boolean;
  /** Why the engine recommends stopping (empty if shouldStop=false). */
  stopReason: string;
  /** True if this answer recovered a previous mistake. */
  recoveredMistake: boolean;
}

export interface AdaptiveQuizSession {
  id: EntityId;
  studentId: EntityId;
  config: AdaptiveQuizConfig;
  /** Questions presented so far. */
  questions: AdaptiveQuizQuestion[];
  /** Indices into questions[] that were answered correctly. */
  correctIndices: number[];
  /** Running difficulty (1-5). */
  currentDifficulty: number;
  /** Current learning state. */
  currentState: LearningState;
  /** Consecutive wrong counter. */
  consecutiveWrong: number;
  /** Session termination reason (empty while active). */
  endedReason: string;
  /** All mastery node IDs touched during this session. */
  touchedNodes: EntityId[];
  startedAt: string;
  endedAt?: string;
}


export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}


// ─── study sessions & planner ────────────────────────────────────────────────

export type PlanItemKind =
  | 'lesson'
  | 'practice'
  | 'quiz'
  | 'exam'
  | 'revision'
  | 'remediation'
  | 'challenge'
  | 'break';

export interface PlanItem {
  id: EntityId;
  studentId: EntityId;
  kind: PlanItemKind;
  title: string;
  titleAr?: string;
  courseId?: EntityId;
  lessonId?: EntityId;
  topic?: string;
  estimatedMinutes: number;
  scheduledFor: string; // ISO date or datetime
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'missed' | 'skipped';
  // adaptive
  reason?: string; // why this item was scheduled
  generatedBy?: 'planner' | 'recovery' | 'spaced-repetition' | 'prerequisite' | 'goal';
}

export interface StudySession {
  id: EntityId;
  studentId: EntityId;
  planItemId?: EntityId;
  startedAt: string;
  endedAt?: string;
  intendedMinutes: number;
  actualMinutes?: number;
  topic: string;
  courseId?: EntityId;
  focusGoal?: string;
  completed: boolean;
  interruptCount?: number;
  notes?: string;
}

// ─── spaced repetition ────────────────────────────────────────────────────────

export type ReviewCardType = 'flashcard' | 'question' | 'concept' | 'mistake';

export interface ReviewCard {
  id: EntityId;
  studentId: EntityId;
  nodeId?: EntityId;
  questionId?: EntityId;
  mistakeId?: EntityId;
  type: ReviewCardType;
  prompt: string;
  promptAr?: string;
  answer: string;
  answerAr?: string;
  difficulty: number; // 1-5
  // sm-2-like state
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt?: string;
  quality?: number; // 0-5
  sourceLessonId?: EntityId;
}

// ─── goals & recovery ─────────────────────────────────────────────────────────

export interface LearningGoal {
  id: EntityId;
  studentId: EntityId;
  title: string;
  titleAr?: string;
  targetSkillIds?: EntityId[];
  targetLessonIds?: EntityId[];
  deadline?: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryPlan {
  id: EntityId;
  studentId: EntityId;
  trigger: 'missed-sessions' | 'low-scores' | 'deadline' | 'dropped-course' | 'manual';
  generatedAt: string;
  expiresAt?: string;
  items: PlanItem[];
  summary: string;
  summaryAr?: string;
}

// ─── gamification ─────────────────────────────────────────────────────────────

export type AchievementType =
  | 'course-completion'
  | 'quiz-mastery'
  | 'streak'
  | 'revision'
  | 'exam-result'
  | 'skill-mastery'
  | 'consistent-study'
  | 'kindness'
  | 'custom';

export interface BadgeDefinition {
  id: EntityId;
  type: AchievementType;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  icon: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  requirement?: Record<string, unknown>;
}

export interface Achievement {
  id: EntityId;
  studentId: EntityId;
  badgeId: EntityId;
  earnedAt: string;
  metadata?: Record<string, unknown>;
}

export interface XPAuditEntry {
  id: EntityId;
  studentId: EntityId;
  amount: number;
  reason: string;
  source: 'lesson' | 'quiz' | 'exam' | 'practice' | 'streak' | 'achievement' | 'ai-tutor' | 'session' | 'bonus' | 'system';
  createdAt: string;
  balanceAfter: number;
}

export interface StudentLevel {
  studentId: EntityId;
  xp: number;
  level: number;
  xpToNext: number;
  streak: number;
  longestStreak: number;
  lastActiveAt: string;
}


// ─── live collaboration ───────────────────────────────────────────────────────

export type LiveRoomKind = 'study-room' | 'quiz-battle' | 'coding-battle';

export type RoomPrivacy = 'public' | 'private' | 'invite-only';

export interface LiveRoom {
  id: EntityId;
  kind: LiveRoomKind;
  hostId: EntityId;
  title: string;
  privacy: RoomPrivacy;
  status: 'waiting' | 'countdown' | 'running' | 'finished';
  courseId?: EntityId;
  language?: 'en' | 'ar';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  settings?: Record<string, unknown>;
}

export interface RoomMembership {
  id: EntityId;
  roomId: EntityId;
  userId: EntityId;
  role: 'host' | 'participant' | 'moderator';
  joinedAt: string;
  finishedAt?: string;
  score?: number;
  rank?: number;
}

// ─── certificates ─────────────────────────────────────────────────────────────

export type CertificateTrigger = 'course-completion' | 'passing-exam' | 'achievement' | 'manual';

export interface Certificate {
  id: EntityId;
  studentId: EntityId;
  courseId?: EntityId;
  title: string;
  titleAr?: string;
  issuedAt: string;
  score?: number;
  trigger: CertificateTrigger;
  issuerId: EntityId;
  issuerName: string;
  verificationCode: string; // public verification id
  hash?: string;
  url?: string;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export type AiProvider = 'gateway-primary' | 'gateway-fallback' | 'local-demo';

export type AiMode =
  | 'explain'
  | 'hint'
  | 'socratic'
  | 'step-by-step'
  | 'exam-prep'
  | 'revision'
  | 'error-explanation'
  | 'full-solution'
  | 'guided-solution'
  | 'assist';

export interface AiConversation {
  id: EntityId;
  studentId: EntityId;
  courseId?: EntityId;
  lessonId?: EntityId;
  title: string;
  titleAr?: string;
  mode: AiMode;
  startedAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface AiMessage {
  id: EntityId;
  conversationId: EntityId;
  role: 'user' | 'ai';
  content: string;
  mode?: AiMode;
  citations?: string[];
  sourceLessonId?: EntityId;
  sourceMaterial?: string;
  model?: string;
  latencyMs?: number;
  costUsd?: number;
  safetyPassed?: boolean;
  createdAt: string;
}

export interface AiRequest {
  studentId: EntityId;
  conversationId?: EntityId;
  lessonId?: EntityId;
  courseId?: EntityId;
  context?: string;
  mode: AiMode;
  prompt: string;
  language: 'en' | 'ar';
  // safety
  allowFullSolution?: boolean;
  academicIntegrityMode?: 'learn' | 'assist' | 'answer';
}

export interface AiResponse {
  ok: boolean;
  content: string;
  citations?: string[];
  sourceLessonId?: EntityId;
  sourceMaterial?: string;
  model?: string;
  latencyMs?: number;
  costUsd?: number;
  error?: 'provider-unavailable' | 'timeout' | 'invalid-response' | 'unsafe' | 'budget' | 'rate-limited';
  usedCache?: boolean;
  provider?: AiProvider;
  safetyPassed?: boolean;
}

export interface AiProviderConfig {
  id: EntityId;
  label: string;
  enabled: boolean;
  kind: 'openai' | 'anthropic' | 'google' | 'azure' | 'custom' | 'demo';
  baseUrl?: string;
  model?: string;
  defaultTimeoutMs?: number;
  maxTokens?: number;
  weight?: number; // routing weight
  route?: 'primary' | 'fallback' | 'cache-only';
}

export interface AiGatewayPolicy {
  defaultProvider: EntityId;
  fallbackChain: EntityId[];
  semanticCacheEnabled: boolean;
  budgetUsdMonthly?: number;
  budgetAlertThreshold?: number; // 0-100
  rateLimitRequestsPerMinute?: number;
  piiRedactionEnabled: boolean;
  unsafeBlockEnabled: boolean;
  academicIntegrityDefaultMode?: AiMode;
}

export interface AiUsageRecord {
  id: EntityId;
  studentId?: EntityId;
  conversationId?: EntityId;
  feature: string; // 'ai-tutor' | 'ask-course' | 'voice' | 'quiz-generate' | ...
  provider: AiProvider;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  happenedAt: string;
  status: 'ok' | 'fallback' | 'error' | 'cached';
}


// ─── attention / focus (privacy-first) ────────────────────────────────────────

export type AttentionSignal =
  | 'responseTime'
  | 'inactivity'
  | 'rapidGuessing'
  | 'repeatedMistake'
  | 'sessionDuration'
  | 'taskSwitch';

export interface AttentionSnapshot {
  id: EntityId;
  studentId: EntityId;
  sessionId?: EntityId;
  signals: Partial<Record<AttentionSignal, number | boolean>>;
  sampledAt: string;
  cameraConsent?: boolean;
  // derived (optional, never punitive on its own)
  needsAttention?: boolean;
  note?: string;
}

// ─── analytics / prediction ───────────────────────────────────────────────────

export type RiskSignal =
  | 'inactivity'
  | 'decliningPerformance'
  | 'missedAssignments'
  | 'repeatedMistakes'
  | 'decreasingStudyTime'
  | 'unfinishedCourse'
  | 'decliningEngagement';

export interface StudentRiskSignal {
  id: EntityId;
  studentId: EntityId;
  signal: RiskSignal;
  severity: 'low' | 'medium' | 'high';
  value?: number;
  observedAt: string;
  explanation: string;
  explanationAr?: string;
  recommendedAction: string;
  recommendedActionAr?: string;
}

export interface StudentRiskSummary {
  studentId: EntityId;
  overall: 'healthy' | 'watch' | 'needs-attention' | 'urgent';
  signals: RiskSignal[];
  explanation: string;
  explanationAr?: string;
  lastComputedAt: string;
}

// ─── audio / notes / mindmap ──────────────────────────────────────────────────

export interface AudioUpload {
  id: EntityId;
  studentId: EntityId;
  courseId?: EntityId;
  lessonId?: EntityId;
  filename: string;
  language: 'en' | 'ar' | 'mixed';
  status: 'uploading' | 'transcribing' | 'processing' | 'done' | 'error';
  durationSeconds?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface AudioProcessingResult {
  audioId: EntityId;
  transcript: string;
  transcriptAr?: string;
  summary: string;
  summaryAr?: string;
  keyPoints: string[];
  generatedQuestions: EntityId[];
  mindMapNodeId?: EntityId;
  studyNotes?: string;
  language: 'en' | 'ar' | 'mixed';
}

export interface MindMapNode {
  id: EntityId;
  parentId?: EntityId;
  label: string;
  labelAr?: string;
  kind: 'concept' | 'lesson' | 'question' | 'resource' | 'note';
  expanded?: boolean;
  children?: EntityId[];
  relatedIds?: EntityId[];
  prerequisiteIds?: EntityId[];
  note?: string;
  sourceLessonId?: EntityId;
  sourceConversationId?: EntityId;
}

// ─── bookmarks ────────────────────────────────────────────────────────────────

export type BookmarkTarget =
  | 'lesson'
  | 'paragraph'
  | 'question'
  | 'ai-explanation'
  | 'resource';

export interface Bookmark {
  id: EntityId;
  studentId: EntityId;
  targetType: BookmarkTarget;
  targetId?: EntityId;
  url?: string;
  excerpt?: string;
  note?: string;
  noteAr?: string;
  tags?: string[];
  reminderAt?: string;
  createdAt: string;
}

// ─── learning dna ─────────────────────────────────────────────────────────────

export interface LearningDNA {
  studentId: EntityId;
  // dynamic, recomputed periodically
  learningSpeed: 'slower' | 'average' | 'faster';
  preferredContentType: Array<'video' | 'text' | 'interactive' | 'practice' | 'discussion'>;
  strongestSubjects: string[];
  weakSubjects: string[];
  consistency: 'low' | 'medium' | 'high';
  difficultyTolerance: 'prefers-challenge' | 'balanced' | 'prefers-easier';
  mistakePatterns: Array<MistakeCategory>;
  studyTiming: Array<'morning' | 'afternoon' | 'evening' | 'night'>;
  lastComputedAt: string;
}

// ─── parent dashboard projection ──────────────────────────────────────────────

export interface ParentProgressSnapshot {
  studentId: EntityId;
  lastUpdatedAt: string;
  completionPercent?: number;
  studyHoursThisWeek?: number;
  studyHoursTotal?: number;
  courseProgress?: Array<{ courseId: EntityId; courseTitle: string; progress: number }>;
  weakAreas?: Array<{ topic: string; topicAr?: string; mastery: number }>;
  upcomingExams?: Array<{ assessmentId: EntityId; title: string; scheduledAt?: string }>;
  streak?: number;
  recentAchievements?: EntityId[];
  alerts?: Array<{ kind: 'low-score' | 'missed-session' | 'deadline' | 'risk'; message: string; messageAr?: string }>;
}


// ─── feature flags ────────────────────────────────────────────────────────────

export type FeatureFlag =
  | 'voice_ai'
  | 'adaptive_learning'
  | 'live_battles'
  | 'study_rooms'
  | 'attention_tracker'
  | 'attention_camera'
  | 'pwa_offline'
  | 'parent_dashboard'
  | 'certificates'
  | 'ai_career'
  | 'code_sandbox'
  | 'ai_gateway'
  | 'ai_eval'
  | 'ai_safety'
  | 'mind_map'
  | 'audio_to_notes'
  | 'semantic_search'
  | 'study_partner'
  | 'prerequisite_checker'
  | 'micro_learning'
  | 'goal_to_mastery'
  | 'recovery_plan'
  | 'dynamic_paths'
  | 'gamification'
  | 'spaced_repetition'
  | 'mistake_notebook'
  | 'focus_mode'
  | 'smart_bookmarks'
  | 'peer_learning'
  | 'virtual_classroom'
  | 'team_challenges'
  | 'learning_dna'
  | 'early_warning'
  | 'auto_recovery'
  | 'ai_content_gen'
  | 'teacher_copilot';

export interface FeatureFlagConfig {
  key: FeatureFlag;
  enabled: boolean;
  roles?: PlatformRole[]; // if absent, everyone
  minEnv?: 'dev' | 'staging' | 'prod';
}

// ─── sandbox / code execution ─────────────────────────────────────────────────

export type SandboxLanguage = 'python' | 'javascript';

export interface SandboxJob {
  id: EntityId;
  studentId: EntityId;
  language: SandboxLanguage;
  source: string;
  status: 'queued' | 'running' | 'done' | 'error' | 'timeout' | 'killed';
  output?: string;
  error?: string;
  exitCode?: number;
  createdAt: string;
  finishedAt?: string;
  // limits
  timeoutMs?: number;
  memoryLimitMb?: number;
}

// ─── exams (exam simulator extras) ────────────────────────────────────────────

export interface ExamResult {
  id: EntityId;
  studentId: EntityId;
  assessmentId: EntityId;
  startedAt: string;
  finishedAt?: string;
  submitted: boolean;
  totalQuestions: number;
  correct: number;
  score: number; // 0-100
  timeUsedSeconds?: number;
  questionResults?: Array<{
    questionId: EntityId;
    correct: boolean;
    timeSpentSeconds: number;
    mistakeId?: EntityId;
  }>;
  analysis?: {
    weakTopics: string[];
    predictedReadiness?: number; // 0-100
    recommendedPlanId?: EntityId;
  };
}

// ─── teachers / classrooms (future) ───────────────────────────────────────────

export interface Classroom {
  id: EntityId;
  teacherId: EntityId;
  title: string;
  titleAr?: string;
  courseId?: EntityId;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface Enrollment {
  id: EntityId;
  studentId: EntityId;
  courseId: EntityId;
  classroomId?: EntityId;
  status: 'active' | 'completed' | 'dropped';
  startedAt?: string;
  completedAt?: string;
  progressPercent?: number;
}

// ─── public helpers ───────────────────────────────────────────────────────────

export function isPlatformRole(value: unknown): value is PlatformRole {
  return (
    value === 'owner' ||
    value === 'admin' ||
    value === 'teacher' ||
    value === 'student' ||
    value === 'parent'
  );
}

export const ALL_FEATURE_FLAGS: FeatureFlag[] = [
  'voice_ai',
  'adaptive_learning',
  'live_battles',
  'study_rooms',
  'attention_tracker',
  'attention_camera',
  'pwa_offline',
  'parent_dashboard',
  'certificates',
  'ai_career',
  'code_sandbox',
  'ai_gateway',
  'ai_eval',
  'ai_safety',
  'mind_map',
  'audio_to_notes',
  'semantic_search',
  'study_partner',
  'prerequisite_checker',
  'micro_learning',
  'goal_to_mastery',
  'recovery_plan',
  'dynamic_paths',
  'gamification',
  'spaced_repetition',
  'mistake_notebook',
] as const;
