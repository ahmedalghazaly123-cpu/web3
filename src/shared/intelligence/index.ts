// ━━━─ LearnPilot Learning Intelligence — public barrel ━━━─
// Phase 1: learning events → evidence pipeline
export {
  learningEvents,
  deriveEvidence,
  registerMisconceptionObserver,
  fnv1a,
  type LearningEvent,
  type LearningEventKind,
  type LearningEventSource,
  type LearningEvent as LearningEventModel,
  type DerivedEvidence,
  type DerivedObservation,
  type IngestResult,
  type MisconceptionObserver,
} from './learning-events.ts';

// Phase 3: knowledge graph validation + intelligence queries
export {
  graphIntelligence,
  validateGraph,
  weakestPrerequisite,
  nextLearnable,
  type GraphIssue,
  type GraphValidationReport,
} from './graph-intelligence.ts';

// Phase 4: misconception engine
export {
  misconceptionEngine,
  classifyMisconception,
  expectedSecondsFor,
  type MisconceptionClassification,
  type MisconceptionClassificationInput,
  type RecordMisconceptionInput,
} from './misconception-engine.ts';

// Phase 5: unified student knowledge model
export {
  studentKnowledgeModel,
  computeStudentKnowledgeState,
  type LearningAnswer,
  type StudentKnowledgeState,
} from './student-knowledge-model.ts';

// Phase 6: adaptive decision engine
export {
  decisionEngine,
  decideNext,
  decideAll,
  type AdaptiveDecision,
  type DecisionAction,
  type DecisionPriority,
  type DecisionContextInput,
} from './decision-engine.ts';

// Phase 7: adaptive quiz engine
export {
  adaptiveQuizEngine,
  determineLearningState,
  targetDifficultyForState,
  selectNextQuestion,
  processAnswer,
  createAdaptiveSession,
  endSession,
  canAskQuestion,
} from './adaptive-quiz.ts';

// Phase 8: spaced repetition & forgetting (SM2-like, deterministic)
export {
  spacedRepetitionEngine,
  scheduleReview,
  ensureReviewCard,
  estimateForgetting,
  dueReviews,
  nextEaseFactor,
  nextIntervalDays,
  type ReviewOutcome,
  type SchedulingResult,
  type ForgettingEstimate,
  type ForgettingModelKind,
} from './spaced-repetition.ts';

// Phase 9: dynamic learning paths
export {
  learningPathEngine,
  buildLearningPath,
  pathToPlanItems,
  type PathStep,
  type PathStepKind,
  type LearningPath,
} from './learning-path.ts';

// Phase 10: risk & struggle intelligence
export {
  riskEngine,
  assessRisk,
  type RiskAssessment,
  type RiskCategory,
  type RiskSignalDetail,
  type RiskSignalKind,
} from './risk-engine.ts';

// Phase 11: planner intelligence
export { plannerEngine, planStudy, type PlannerInput, type PlannerOutput } from './planner.ts';

// Phase 12: AI tutor context foundation
export { tutorContextEngine, buildTutorContext, hintFor, type TutorContext } from './tutor-context.ts';

// Phase 13: ask-your-course retrieval
export { courseRetrieval, askCourse, type CourseChunk, type GroundedAnswer } from './course-retrieval.ts';

// Phases 14-16 + 17-19 + 20-23 barrel entries
export { voiceEngine, audioNotesEngine, mindMapEngine } from './voice-audio-mindmap.ts';
export { studyToolsEngine, examEngine } from './study-exam.ts';
export { growthEngine, computeLearningDNA, careerReadiness, simulateProgress, recoveryPlan } from './growth.ts';
export { engagementEngine, awardMeaningfulXp, focusSummary } from './engagement.ts';
export { collaborationEngine, createStudyRoom, logClassroomAttendance } from './collaboration.ts';
export { stakeholderEngine, teacherInsights, parentSnapshot, institutionCohorts } from './stakeholders.ts';
export { productionEngine } from './production.ts';
