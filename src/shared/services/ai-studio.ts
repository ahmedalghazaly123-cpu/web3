// ━━━ AI Studio — grounded course answers, voice fallback, mind maps, notes ━━━
import type { EntityId } from '../domain';
import { aiGateway } from './ai-gateway.ts';
import { courseRetrieval } from '../intelligence/course-retrieval.ts';
import { knowledgeGraph } from './knowledge-graph.ts';
import { courses } from '../../data/index.ts';

function nowIso(): string { return new Date().toISOString(); }

export const aiStudio = {
  async askCourse(studentId: EntityId, courseId: EntityId, question: string, lessonId?: EntityId) {
    const cid = String(courseId);
    const course = courses.find((c) => String(c.id) === cid || String(c.id) === 'calculus-1');
    const ctx = lessonId ? knowledgeGraph.getContextForLesson(lessonId) : { concepts: [], prerequisites: [], related: [] };
    const conceptList = ctx.concepts.map((c) => c.label).join(', ') || 'course overview';

    // Primary: real RAG backend (grounded answer with citations). The backend
    // resolves the course by its DB id; map the legacy demo id to the seeded DB
    // course so real indexing is hit instead of demo text.
    const DB_COURSE_ALIASES: Record<string, string> = {
      'calculus-1': 'seed-course-calculus-1',
    };
    const dbCourseId = DB_COURSE_ALIASES[String(courseId)] ?? String(courseId);
    let groundedAnswer: { answer: string; citations: string[] } | null = null;
    try {
      const res = await courseRetrieval.askCourse(question, dbCourseId);
      if (res.grounded && res.answer) {
        groundedAnswer = { answer: res.answer, citations: res.citations };
      }
    } catch { /* fall through to gateway */ }

    const answer = groundedAnswer?.answer ?? (await aiGateway.send({
      prompt: question, mode: 'explain', courseId, lessonId, studentId,
      language: 'en',
    })).content;

    return {
      answer,
      courseTitle: course?.title ?? cid,
      concepts: conceptList,
      sources: groundedAnswer
        ? groundedAnswer.citations.slice(0, 5)
        : [`${course?.title ?? cid}${lessonId ? ` › ${lessonId}` : ''}`],
      related: ctx.related.map((r) => r.label).slice(0, 5),
    };
  },

  // Voice tutor fallback chain: browser STT/TTS when available, else text
  voiceSupport(): { stt: boolean; tts: boolean } {
    const w = window as unknown as Record<string, unknown>;
    return {
      stt: Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition),
      tts: 'speechSynthesis' in window,
    };
  },
  speak(text: string, lang: 'en' | 'ar', rate = 1) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      u.rate = rate;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* TTS unavailable — caller shows text fallback */ }
  },
  stopSpeak() { try { window.speechSynthesis.cancel(); } catch { /* noop */ } },

  // Mind map from lesson/concepts
  mindMap(input: EntityId) {
    const graph = knowledgeGraph.get();
    const byLabel = graph.nodes.find((n) => n.label.toLowerCase() === String(input).toLowerCase());
    const lessonId = byLabel?.id ?? (graph.nodes.find((n) => n.id === String(input))?.id ?? 'l3');
    const ctx = knowledgeGraph.getContextForLesson(lessonId);
    const root = { id: lessonId, label: byLabel?.label ?? String(input), children: ctx.concepts.map((c) => ({ id: c.id, label: c.label })) };
    return root;
  },

  // Audio → notes pipeline (transcript supplied by STT/file; processing local)
  audioToNotes(transcript: string, lang: 'en' | 'ar') {
    const sentences = transcript.split(/[.!؟。\n]+/).map((s) => s.trim()).filter(Boolean);
    const words = transcript.toLowerCase().split(/\s+/);
    const freq = new Map<string, number>();
    for (const w of words) { const k = w.replace(/[^a-z\u0600-\u06ff0-9]/gi, ''); if (k.length > 3) freq.set(k, (freq.get(k) ?? 0) + 1); }
    const keywords = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
    return {
      summary: sentences.slice(0, 3).join('. '),
      keyPoints: sentences.slice(0, 6),
      keywords,
      questions: keywords.slice(0, 3).map((k) => (lang === 'ar' ? `ما المقصود بـ ${k}؟ اشرح باختصار.` : `What is ${k}? Explain briefly.`)),
      mindMapSeed: keywords,
    };
  },

  // Teacher content generator (review-before-publish enforced by UI copy)
  generateStudyPack(topic: string, lang: 'en' | 'ar', count = 4) {
    return {
      summary: lang === 'ar' ? `ملخص ${topic}: المفاهيم الأساسية والخطوات العملية.` : `Summary of ${topic}: key concepts and worked steps.`,
      objectives: [0, 1, 2].map((i) => (lang === 'ar' ? `هدف ${i + 1}: إتقان جزء من ${topic}` : `Objective ${i + 1}: master part of ${topic}`)),
      flashcards: Array.from({ length: count }, (_, i) => ({ front: `${topic} — card ${i + 1}`, back: `Key idea ${i + 1} of ${topic}` })),
      quiz: Array.from({ length: count }, (_, i) => ({ q: `${topic} question ${i + 1}?`, choices: ['A', 'B', 'C', 'D'], answer: i % 4 })),
      createdAt: nowIso(),
      needsReview: true as const,
    };
  },

  careerFinder(input: { strengths: string[]; interests: string[]; masteryAvg: number }) {
    const dirs = [
      { id: 'frontend', label: 'Frontend Developer', match: input.interests.includes('web') || input.strengths.includes('JavaScript') ? 85 : 55 },
      { id: 'data', label: 'Data Analyst', match: input.strengths.includes('Math') ? 82 : 58 },
      { id: 'backend', label: 'Backend Developer', match: input.masteryAvg >= 60 ? 78 : 52 },
    ].sort((a, b) => b.match - a.match);
    return { directions: dirs, disclaimer: 'Exploratory guidance only — not a guaranteed outcome.', nextSteps: ['Build 2 portfolio projects', 'Finish one related course', 'Practice weekly'] };
  },

  evalScore(answer: string, sourceText: string) {
    const a = new Set(answer.toLowerCase().split(/\s+/));
    const s = new Set(sourceText.toLowerCase().split(/\s+/));
    let hit = 0; a.forEach((w) => { if (s.has(w)) hit++; });
    const relevance = a.size ? hit / a.size : 0;
    return { relevance: Math.round(relevance * 100), hallucinationRisk: Math.round((1 - relevance) * 100), latencyNote: 'local-demo', costUsd: 0 };
  },
};
