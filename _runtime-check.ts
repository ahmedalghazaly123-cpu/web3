// Runtime smoke test for the new shared services (stubbed storage, real logic).
const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() { return Object.keys(store).length; },
};
globalThis.window = globalThis;

import { knowledgeGraph } from './src/shared/services/knowledge-graph.ts';
import { masteryEngine } from './src/shared/services/mastery.ts';
import { learningEngine } from './src/shared/services/learning-engine.ts';
import { productivity } from './src/shared/services/productivity.ts';
import { collab } from './src/shared/services/collab.ts';
import { trust } from './src/shared/services/trust.ts';
import { aiStudio } from './src/shared/services/ai-studio.ts';
import { featureFlags } from './src/shared/services/feature-flags.ts';

const sid = 'student-001';
const out: string[] = [];
const ok = (name: string, cond: unknown) => out.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);

// 1. Knowledge graph seeding
knowledgeGraph.seedDemo();
const g = knowledgeGraph.get();
ok('graph seeded', g.nodes.length >= 6 && g.edges.length >= 4);
ok('graph prerq (direction per _addPrerequisite convention)', knowledgeGraph.getPrerequisites('c-deriv').includes('c-limits'));

// 2. Mastery seeding
const seeded = masteryEngine.seedDemoData(sid, g.nodes.slice(0, 8).map((n) => ({ id: n.id, type: n.type, mastery: 40 })));
ok('mastery seeded', seeded.length === 7 && masteryEngine.listByStudent(sid).length === 7);

// 3. Adaptive quiz
const q = learningEngine.nextQuestion(sid, 'course-calculus-1', 'Limits');
ok('adaptive question', Boolean(q?.id) && q.difficulty >= 1 && q.difficulty <= 5);
const r = learningEngine.answer(sid, 'course-calculus-1', 'course', q, learningEngine.answerOf(q), 8);
ok('adaptive answer correct', r.correct === true && r.record.mastery >= 0);
const w = learningEngine.answer(sid, 'course-calculus-1', 'course', q, (learningEngine.answerOf(q) + 1) % Math.max(4, learningEngine.choicesOf(q).length), 30);
ok('adaptive answer wrong records mistake', w.correct === false);

// 4. Spaced repetition
learningEngine.scheduleReview(sid, 'course-calculus-1', 5);
ok('review scheduled', store['lp-store-reviews'] !== undefined && JSON.parse(store['lp-store-reviews']).length >= 1);

// 5. Dynamic path
const path = learningEngine.dynamicPath(sid, 'course-calculus-1');
ok('dynamic path', Array.isArray(path.next) && Array.isArray(path.mastered));

// 6. Gamification / streak
const lvl = productivity.awardXp(sid, 250, 'test');
ok('xp + level', lvl.xp === 250 && lvl.level >= 2);
const streak = productivity.bumpStreak(sid);
ok('streak', streak >= 1);

// 7. Focus session + attention + bookmark
const sess = productivity.focusSession(sid, 25, 'Deep work');
ok('focus session', Boolean(sess.id));
const att = productivity.logAttention(sid, { rapidGuesses: 2, mistakes: 1 });
ok('attention snapshot', att.needsAttention !== undefined);
const bm = productivity.bookmark(sid, 'lesson', 'l3', 'review chain rule');
ok('bookmark', Boolean(bm.id));

// 8. Collab rooms
const room = collab.createRoom(sid, 'quiz-battle', 'Midterm race', 'course-calculus-1');
const joined = collab.join(room.id, sid, 'You');
const started = collab.start(room.id);
const finished = collab.finish(room.id);
ok('room lifecycle', joined.ok === true && started?.status === 'running' && finished?.winner === sid && finished.code.length >= 4);

// 9. Risk & certificates
const risk = trust.risk(sid);
ok('risk score', risk.score >= 0 && risk.score <= 100);
const cert = trust.issueCertificate(sid, 'Ahmed', 'calculus-1', 'Calculus I', 91) as
    | { verificationCode: string; studentId: string }
    | undefined;
ok('certificate issued (returns record)', Boolean(cert));
ok('certificate verifiable', Boolean(cert && trust.verify(cert.verificationCode)?.studentId === sid));
ok('offline queue', trust.queueOp({ kind: 'attempt', payload: { q: 1 } }) >= 1 && trust.drainQueue() >= 1);

// 10. AI studio
const mind = aiStudio.mindMap('l3');
ok('mind map', Boolean(mind.label) && Array.isArray(mind.children));
const notes = aiStudio.audioToNotes('Limits describe the value a function approaches. Direct substitution works.', 'en');
ok('audio notes', notes.keywords.length >= 1 && notes.summary.includes('Limits'));
const pack = aiStudio.generateStudyPack('Limits', 'en', 3);
ok('study pack', pack.needsReview === true && pack.flashcards.length === 3);
const cp = aiStudio.evalScore('lim x approach 2', 'limits direct substitution');
ok('eval score', cp.relevance >= 0 && cp.hallucinationRisk >= 0);
const career = aiStudio.careerFinder({ strengths: ['Math'], interests: ['web'], masteryAvg: 65 });
ok('career finder', career.directions.length >= 2 && career.disclaimer.length > 0);

// 11. Voice support detection (stubbed → graceful degradation)
const vs = aiStudio.voiceSupport();
ok('voice support flag', vs.stt === false && vs.tts === false);

// 12. Feature flags
ok('voice flag enabled', featureFlags.isEnabled('voice_ai'));
ok('camera flag off by default', !featureFlags.isEnabled('attention_camera'));

const fails = out.filter((l) => l.startsWith('FAIL'));
console.log(out.join('\n'));
console.log(fails.length === 0 ? 'RUNTIME_SMOKE_ALL_OK' : `RUNTIME_SMOKE_FAILURES=${fails.length}`);