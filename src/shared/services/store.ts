// ━━━─ Local Persistence Bridge ━━━─
// Backend-ready shapes, localStorage-backed for the demo.
// Replace with API client in production; the domain types stay the same.

import type {
  EntityId,
  PlatformUser,
  KnowledgeGraph,
  MasteryRecord,
  MistakeEntry,
  ReviewCard,
  PlanItem,
  StudySession,
  Achievement,
  StudentLevel,
  AiConversation,
  AiMessage,
  QuestionAttempt,
  AiUsageRecord,
  ParentLink,
  Enrollment,
  Certificate,
  Bookmark,
  LearningGoal,
  RecoveryPlan,
  ExamResult,
  LearningDNA,
  ParentProgressSnapshot,
  AttentionSnapshot,
  LiveRoom,
  RoomMembership,
  Question,
  Assessment,
  AiProviderConfig,
  AiGatewayPolicy,
} from '../domain';
import type { SandboxJob as _SandboxJob } from '../domain';
void 0 as unknown as _SandboxJob | undefined;

// ─── persistence backend abstraction ─────────────────────────────────────────
// Phase 1 (Learning Intelligence Foundation) quality gate: persistence must be
// swappable. Default backend is localStorage; tests use the in-memory backend;
// the future production backend is a remote API implementing the same contract.

export interface StoreBackend {
  /** Return the persisted JSON value for a namespace, or null when absent. */
  read(ns: string): string | null;
  write(ns: string, value: string): void;
  remove(ns: string): void;
}

function localStorageBackend(): StoreBackend {
  return {
    read(ns) {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(ns) : null;
      } catch {
        return null;
      }
    },
    write(ns, value) {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(ns, value);
      } catch {
        // storage unavailable (quota / private mode) — write dropped, reads stay consistent
      }
    },
    remove(ns) {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(ns);
      } catch {
        // ignore
      }
    },
  };
}

const inMemoryMap = new Map<string, string>();

function inMemoryBackend(): StoreBackend {
  return {
    read(ns) {
      return inMemoryMap.has(ns) ? (inMemoryMap.get(ns) as string) : null;
    },
    write(ns, value) {
      inMemoryMap.set(ns, value);
    },
    remove(ns) {
      inMemoryMap.delete(ns);
    },
  };
}

let activeBackend: StoreBackend = localStorageBackend();

export const storeBackend = {
  /** Swaps the persistence backend (tests: memory; production: remote API adapter). */
  use(backend: StoreBackend): void {
    activeBackend = backend;
  },
  useLocalStorage(): void {
    activeBackend = localStorageBackend();
  },
  useInMemory(): void {
    activeBackend = inMemoryBackend();
  },
  /** True when localStorage-backed (i.e., NOT the in-memory test backend). */
  isPersistent(): boolean {
    return activeBackend !== inMemoryBackend();
  },
};

/** Raw learning-event entity as persisted (flat JSON, backend-sync ready). */
export interface StoredRawEvent {
  id: EntityId;
  studentId: EntityId;
  [key: string]: unknown;
}

type StoreNamespace =
  | 'users'
  | 'graph'
  | 'mastery'
  | 'mistakes'
  | 'reviews'
  | 'plans'
  | 'sessions'
  | 'achievements'
  | 'level'
  | 'conversations'
  | 'messages'
  | 'attempts'
  | 'usage'
  | 'parent-links'
  | 'enrollments'
  | 'certificates'
  | 'bookmarks'
  | 'goals'
  | 'recovery'
  | 'sandbox'
  | 'exam-results'
  | 'dna'
  | 'parent-snapshots'
  | 'attention'
  | 'rooms'
  | 'room-members'
  | 'questions'
  | 'assessments'
  | 'ai-providers'
  | 'ai-policy'
  | 'events';

const NS_KEY: Record<StoreNamespace, string> = {
  users: 'lp-store-users',
  graph: 'lp-store-graph',
  mastery: 'lp-store-mastery',
  mistakes: 'lp-store-mistakes',
  reviews: 'lp-store-reviews',
  plans: 'lp-store-plans',
  sessions: 'lp-store-sessions',
  achievements: 'lp-store-achievements',
  level: 'lp-store-level',
  conversations: 'lp-store-conversations',
  messages: 'lp-store-messages',
  attempts: 'lp-store-attempts',
  usage: 'lp-store-usage',
  'parent-links': 'lp-store-parent-links',
  enrollments: 'lp-store-enrollments',
  certificates: 'lp-store-certificates',
  bookmarks: 'lp-store-bookmarks',
  goals: 'lp-store-goals',
  recovery: 'lp-store-recovery',
  sandbox: 'lp-store-sandbox',
  'exam-results': 'lp-store-exam-results',
  dna: 'lp-store-dna',
  'parent-snapshots': 'lp-store-parent-snapshots',
  attention: 'lp-store-attention',
  rooms: 'lp-store-rooms',
  'room-members': 'lp-store-room-members',
  questions: 'lp-store-questions',
  assessments: 'lp-store-assessments',
  'ai-providers': 'lp-store-ai-providers',
  'ai-policy': 'lp-store-ai-policy',
  events: 'lp-store-events',
};

function read<T>(ns: StoreNamespace): T[] {
  try {
    const raw = activeBackend.read(NS_KEY[ns]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<T>(ns: StoreNamespace, value: T[]) {
  try {
    activeBackend.write(NS_KEY[ns], JSON.stringify(value));
  } catch {
    // serialization failed — write dropped, reads stay consistent
  }
}

function uid(): EntityId {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function byId<T extends { id?: EntityId }>(list: T[], id: EntityId): T | undefined {
  return list.find((x) => x.id === id);
}

function byStudentId<T extends { studentId: EntityId }>(list: T[], studentId: EntityId): T | undefined {
  return list.find((x) => x.studentId === studentId);
}

function upsert<T extends { id?: EntityId }>(list: T[], item: T & { id: EntityId }): T[] {
  const i = list.findIndex((x) => x.id === (item as T).id);
  if (i >= 0) {
    const next = list.slice();
    next[i] = item as T;
    return next;
  }
  return [...list, item as T];
}

function upsertByStudentId<T extends { studentId: EntityId }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.studentId === item.studentId);
  if (i >= 0) {
    const next = list.slice();
    next[i] = item;
    return next;
  }
  return [...list, item];
}

function del<T extends { id?: EntityId }>(list: T[], id: EntityId): T[] {
  return list.filter((x) => x.id !== id);
}

function dedupe<T extends { id?: EntityId }>(list: T[]): T[] {
  return list.filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
}

// ─── public API ───────────────────────────────────────────────────────────────

export const store = {
  uid,

  // Users
  users: {
    list: () => read<PlatformUser>('users'),
    get: (id: EntityId) => byId(read<PlatformUser>('users'), id),
    save: (u: PlatformUser) => write('users', upsert(read<PlatformUser>('users'), u)),
    remove: (id: EntityId) => write('users', del(read<PlatformUser>('users'), id)),
  },

  // Graph
  graph: {
    get: (): KnowledgeGraph => {
      const data = read<KnowledgeGraph>('graph');
      return data[0] ?? { nodes: [], edges: [] };
    },
    save: (g: KnowledgeGraph) => write('graph', [g]),
  },

  // Mastery
  mastery: {
    list: () => read<MasteryRecord>('mastery'),
    get: (studentId: EntityId, nodeId: EntityId) =>
      read<MasteryRecord>('mastery').find(
        (r) => r.studentId === studentId && r.nodeId === nodeId
      ),
    listByStudent: (studentId: EntityId) =>
      read<MasteryRecord>('mastery').filter((r) => r.studentId === studentId),
    save: (r: MasteryRecord) =>
      write('mastery', upsert(read<MasteryRecord>('mastery'), r)),
    saveMany: (rs: MasteryRecord[]) =>
      write('mastery', dedupe([...read<MasteryRecord>('mastery'), ...rs])),
    remove: (id: EntityId) =>
      write('mastery', del(read<MasteryRecord>('mastery'), id)),
    clearByStudent(studentId: EntityId) {
      write('mastery', read<MasteryRecord>('mastery').filter((r) => r.studentId !== studentId));
    },
  },

  // Mistakes
  mistakes: {
    list: () => read<MistakeEntry>('mistakes'),
    listByStudent: (studentId: EntityId) =>
      read<MistakeEntry>('mistakes').filter((m) => m.studentId === studentId),
    get: (id: EntityId) => byId(read<MistakeEntry>('mistakes'), id),
    save: (m: MistakeEntry) =>
      write('mistakes', upsert(read<MistakeEntry>('mistakes'), m)),
    remove: (id: EntityId) =>
      write('mistakes', del(read<MistakeEntry>('mistakes'), id)),
    clearAll() {
      write('mistakes', []);
    },
  },

  // Reviews (spaced repetition cards)
  reviews: {
    list: () => read<ReviewCard>('reviews'),
    listDue: (studentId: EntityId, before?: string): ReviewCard[] => {
      const now = before ?? new Date().toISOString();
      return read<ReviewCard>('reviews')
        .filter((c) => c.studentId === studentId && c.nextReviewAt <= now)
        .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
    },
    listByStudent: (studentId: EntityId) =>
      read<ReviewCard>('reviews').filter((c) => c.studentId === studentId),
    get: (id: EntityId) => byId(read<ReviewCard>('reviews'), id),
    save: (c: ReviewCard) =>
      write('reviews', upsert(read<ReviewCard>('reviews'), c)),
    remove: (id: EntityId) =>
      write('reviews', del(read<ReviewCard>('reviews'), id)),
    clearAll() {
      write('reviews', []);
    },
  },

  // Plans (planner items)
  plans: {
    list: () => read<PlanItem>('plans'),
    listByStudent: (studentId: EntityId) =>
      read<PlanItem>('plans').filter((p) => p.studentId === studentId),
    listUpcoming: (studentId: EntityId, from: string, to: string) =>
      read<PlanItem>('plans')
        .filter(
          (p) =>
            p.studentId === studentId &&
            p.scheduledFor >= from &&
            p.scheduledFor <= to
        )
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)),
    get: (id: EntityId) => byId(read<PlanItem>('plans'), id),
    save: (p: PlanItem) =>
      write('plans', upsert(read<PlanItem>('plans'), p)),
    saveMany: (ps: PlanItem[]) =>
      write('plans', dedupe([...read<PlanItem>('plans'), ...ps])),
    remove: (id: EntityId) =>
      write('plans', del(read<PlanItem>('plans'), id)),
  },

  // Study sessions
  sessions: {
    list: () => read<StudySession>('sessions'),
    listByStudent: (studentId: EntityId) =>
      read<StudySession>('sessions').filter((s) => s.studentId === studentId),
    get: (id: EntityId) => byId(read<StudySession>('sessions'), id),
    save: (s: StudySession) =>
      write('sessions', upsert(read<StudySession>('sessions'), s)),
    remove: (id: EntityId) =>
      write('sessions', del(read<StudySession>('sessions'), id)),
  },

  // Achievements
  achievements: {
    list: () => read<Achievement>('achievements'),
    listByStudent: (studentId: EntityId) =>
      read<Achievement>('achievements').filter((a) => a.studentId === studentId),
    save: (a: Achievement) =>
      write('achievements', upsert(read<Achievement>('achievements'), a)),
  },

  // Student level / XP / streak
  level: {
    get: (studentId: EntityId): StudentLevel | undefined =>
      byStudentId(read<StudentLevel>('level'), studentId),
    save: (l: StudentLevel) =>
      write('level', upsertByStudentId(read<StudentLevel>('level'), l)),
  },

  // AI conversations / messages
  conversations: {
    list: () => read<AiConversation>('conversations'),
    listByStudent: (studentId: EntityId) =>
      read<AiConversation>('conversations').filter((c) => c.studentId === studentId),
    get: (id: EntityId) => byId(read<AiConversation>('conversations'), id),
    save: (c: AiConversation) =>
      write('conversations', upsert(read<AiConversation>('conversations'), c)),
    remove: (id: EntityId) =>
      write('conversations', del(read<AiConversation>('conversations'), id)),
  },
  messages: {
    listByConversation: (conversationId: EntityId) =>
      read<AiMessage>('messages').filter((m) => m.conversationId === conversationId),
    save: (m: AiMessage) =>
      write('messages', upsert(read<AiMessage>('messages'), m)),
    saveMany: (ms: AiMessage[]) =>
      write('messages', dedupe([...read<AiMessage>('messages'), ...ms])),
    removeByConversation: (conversationId: EntityId) =>
      write(
        'messages',
        read<AiMessage>('messages').filter((m) => m.conversationId !== conversationId)
      ),
  },

  // Question attempts
  attempts: {
    listByStudent: (studentId: EntityId) =>
      read<QuestionAttempt>('attempts').filter((a) => a.studentId === studentId),
    save: (a: QuestionAttempt) =>
      write('attempts', upsert(read<QuestionAttempt>('attempts'), a)),
    saveMany: (as: QuestionAttempt[]) =>
      write('attempts', dedupe([...read<QuestionAttempt>('attempts'), ...as])),
  },

  // AI usage records
  usage: {
    list: () => read<AiUsageRecord>('usage'),
    listByStudent: (studentId: EntityId) =>
      read<AiUsageRecord>('usage').filter((u) => u.studentId === studentId),
    save: (u: AiUsageRecord) =>
      write('usage', upsert(read<AiUsageRecord>('usage'), u)),
  },

  // Parent links
  parentLinks: {
    list: () => read<ParentLink>('parent-links'),
    listByStudent: (studentId: EntityId) =>
      read<ParentLink>('parent-links').filter(
        (p) => p.studentUserId === studentId && p.status === 'active'
      ),
    listByParent: (parentUserId: EntityId) =>
      read<ParentLink>('parent-links').filter(
        (p) => p.parentUserId === parentUserId && p.status === 'active'
      ),
    save: (p: ParentLink) =>
      write('parent-links', upsert(read<ParentLink>('parent-links'), p)),
    remove: (id: EntityId) =>
      write('parent-links', del(read<ParentLink>('parent-links'), id)),
  },

  // Enrollments
  enrollments: {
    list: () => read<Enrollment>('enrollments'),
    listByStudent: (studentId: EntityId) =>
      read<Enrollment>('enrollments').filter((e) => e.studentId === studentId),
    get: (id: EntityId) => byId(read<Enrollment>('enrollments'), id),
    save: (e: Enrollment) =>
      write('enrollments', upsert(read<Enrollment>('enrollments'), e)),
  },

  // Certificates
  certificates: {
    list: () => read<Certificate>('certificates'),
    listByStudent: (studentId: EntityId) =>
      read<Certificate>('certificates').filter((c) => c.studentId === studentId),
    getByVerificationCode: (code: string) =>
      byId(read<Certificate>('certificates'), code),
    save: (c: Certificate) =>
      write('certificates', upsert(read<Certificate>('certificates'), c)),
  },

  // Bookmarks
  bookmarks: {
    list: () => read<Bookmark>('bookmarks'),
    listByStudent: (studentId: EntityId) =>
      read<Bookmark>('bookmarks').filter((b) => b.studentId === studentId),
    save: (b: Bookmark) =>
      write('bookmarks', upsert(read<Bookmark>('bookmarks'), b)),
    remove: (id: EntityId) =>
      write('bookmarks', del(read<Bookmark>('bookmarks'), id)),
  },

  // Goals
  goals: {
    listByStudent: (studentId: EntityId) =>
      read<LearningGoal>('goals').filter((g) => g.studentId === studentId),
    get: (id: EntityId) => byId(read<LearningGoal>('goals'), id),
    save: (g: LearningGoal) =>
      write('goals', upsert(read<LearningGoal>('goals'), g)),
    remove: (id: EntityId) =>
      write('goals', del(read<LearningGoal>('goals'), id)),
  },

  // Recovery plans
  recovery: {
    listByStudent: (studentId: EntityId) =>
      read<RecoveryPlan>('recovery').filter((r) => r.studentId === studentId),
    get: (id: EntityId) => byId(read<RecoveryPlan>('recovery'), id),
    save: (r: RecoveryPlan) =>
      write('recovery', upsert(read<RecoveryPlan>('recovery'), r)),
    remove: (id: EntityId) =>
      write('recovery', del(read<RecoveryPlan>('recovery'), id)),
  },

  // Exam results
  examResults: {
    listByStudent: (studentId: EntityId) =>
      read<ExamResult>('exam-results').filter((r) => r.studentId === studentId),
    get: (id: EntityId) => byId(read<ExamResult>('exam-results'), id),
    save: (r: ExamResult) =>
      write('exam-results', upsert(read<ExamResult>('exam-results'), r)),
  },

  // Learning DNA
  dna: {
    get: (studentId: EntityId): LearningDNA | undefined =>
      byStudentId(read<LearningDNA>('dna'), studentId),
    save: (d: LearningDNA) =>
      write('dna', upsertByStudentId(read<LearningDNA>('dna'), d)),
  },

  // Parent progress snapshots
  parentSnapshots: {
    get: (studentId: EntityId): ParentProgressSnapshot | undefined =>
      byStudentId(read<ParentProgressSnapshot>('parent-snapshots'), studentId),
    save: (s: ParentProgressSnapshot) =>
      write(
        'parent-snapshots',
        upsertByStudentId(read<ParentProgressSnapshot>('parent-snapshots'), s)
      ),
  },

  // Attention snapshots
  attention: {
    listByStudent: (studentId: EntityId) =>
      read<AttentionSnapshot>('attention').filter((a) => a.studentId === studentId),
    save: (a: AttentionSnapshot) =>
      write('attention', upsert(read<AttentionSnapshot>('attention'), a)),
  },

  // Live rooms / memberships
  rooms: {
    list: () => read<LiveRoom>('rooms'),
    get: (id: EntityId) => byId(read<LiveRoom>('rooms'), id),
    save: (r: LiveRoom) =>
      write('rooms', upsert(read<LiveRoom>('rooms'), r)),
    remove: (id: EntityId) =>
      write('rooms', del(read<LiveRoom>('rooms'), id)),
  },
  roomMembers: {
    listByRoom: (roomId: EntityId) =>
      read<RoomMembership>('room-members').filter((m) => m.roomId === roomId),
    listByUser: (userId: EntityId) =>
      read<RoomMembership>('room-members').filter((m) => m.userId === userId),
    save: (m: RoomMembership) =>
      write('room-members', upsert(read<RoomMembership>('room-members'), m)),
    remove: (id: EntityId) =>
      write('room-members', del(read<RoomMembership>('room-members'), id)),
  },

  // Questions & assessments (shared question bank)
  questions: {
    list: () => read<Question>('questions'),
    listByCourse: (courseId: EntityId) =>
      read<Question>('questions').filter((q) => q.courseId === courseId),
    listByLesson: (lessonId: EntityId) =>
      read<Question>('questions').filter((q) => q.lessonId === lessonId),
    listByTopic: (topic: string) =>
      read<Question>('questions').filter((q) => q.topic === topic),
    get: (id: EntityId) => byId(read<Question>('questions'), id),
    save: (q: Question) =>
      write('questions', upsert(read<Question>('questions'), q)),
    saveMany: (qs: Question[]) =>
      write('questions', dedupe([...read<Question>('questions'), ...qs])),
  },
  assessments: {
    list: () => read<Assessment>('assessments'),
    get: (id: EntityId) => byId(read<Assessment>('assessments'), id),
    save: (a: Assessment) =>
      write('assessments', upsert(read<Assessment>('assessments'), a)),
  },

  // AI providers / policy
  aiProviders: {
    list: () => read<AiProviderConfig>('ai-providers'),
    save: (list: AiProviderConfig[]) => write('ai-providers', list),
  },
  aiPolicy: {
    get: (): AiGatewayPolicy | undefined => {
      const data = read<AiGatewayPolicy>('ai-policy');
      return data[0];
    },
    save: (p: AiGatewayPolicy) => write('ai-policy', [p]),
  },

  // Learning events (Phase 1: append-only raw event log; de-duped upstream).
  // Stored as flat JSON entities ready to be synced to the future backend.
  events: {
    listByStudent: (studentId: EntityId) =>
      read<StoredRawEvent>('events').filter((e) => e.studentId === studentId),
    append: (e: StoredRawEvent) =>
      write('events', [...read<StoredRawEvent>('events'), e]),
    clearByStudent: (studentId: EntityId) =>
      write('events', read<StoredRawEvent>('events').filter((e) => e.studentId !== studentId)),
  },

  // Test utility — clears every namespace at once (in-memory + localStorage).
  clearAll() {
    write('users', []);
    write('graph', [{ nodes: [], edges: [] }]);
    write('mastery', []);
    write('mistakes', []);
    write('reviews', []);
    write('plans', []);
    write('sessions', []);
    write('achievements', []);
    write('level', []);
    write('conversations', []);
    write('messages', []);
    write('attempts', []);
    write('usage', []);
    write('parent-links', []);
    write('enrollments', []);
    write('certificates', []);
    write('bookmarks', []);
    write('goals', []);
    write('recovery', []);
    write('sandbox', []);
    write('dna', []);
    write('parent-snapshots', []);
    write('attention', []);
    write('rooms', []);
    write('room-members', []);
    write('questions', []);
    write('assessments', []);
    write('ai-providers', []);
    write('ai-policy', []);
    write('events', []);
  },
};
