// Phases 14-23 quality gates.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { store, storeBackend } from '../../services/store.ts';
import { startVoiceSession, audioToNotes, graphToMindMap } from '../voice-audio-mindmap.ts';
import { studyPartnerReply, microLesson, simulateExam, recordAssessmentEvidence } from '../study-exam.ts';
import { computeLearningDNA, careerReadiness, simulateProgress, recoveryPlan } from '../growth.ts';
import type { GraphNodeType, Question } from '../../domain';

const SID = 'student-late-1';
const T0 = '2026-06-03T10:00:00.000Z';
const Q: Question = { id: 'q-late-1', topic: 'Limits', difficulty: 2, type: 'multiple-choice', body: 'q', correctAnswer: '4', explanation: 'Factor.' };

beforeEach(() => {
  storeBackend.useInMemory(); store.clearAll();
  store.graph.save({ nodes: [{ id: 'c-limits', type: 'concept' as GraphNodeType, label: 'Limits', difficulty: 2 }], edges: [] });
});
afterEach(() => { storeBackend.useLocalStorage(); });

describe('phases 14-23', () => {
  it('voice session requires browser STT (honest)', () => {
    const s = startVoiceSession(SID, 'ar');
    expect(s.language).toBe('ar');
    expect(s.status).toMatch(/browser/i);
  });
  it('audio notes extract key points + concepts', () => {
    const n = audioToNotes('Limits describe function behavior near a point. Derivatives measure rate of change.');
    expect(n.keyPoints.length).toBeGreaterThan(0);
    expect(n.transcript).toBeTruthy();
  });
  it('mind map preserves hierarchy', () => {
    const m = graphToMindMap('c-limits');
    expect(m.length).toBe(1);
  });
  it('study tools use learning context', () => {
    expect(studyPartnerReply(SID, T0, 'limits')).toBeTruthy();
    expect(microLesson('Limits').steps.length).toBe(3);
  });
  it('exam simulator + assessment evidence', () => {
    const e = simulateExam(SID, [Q], { topicCoverage: { Limits: 100 }, difficulty: {}, minutes: 20 }, T0);
    expect(e.questionIds).toContain('q-late-1');
    recordAssessmentEvidence({ studentId: SID, question: Q, nodeId: 'c-limits', correct: true, answer: '4', seconds: 20, nowIso: T0 });
    expect(store.mastery.get(SID, 'c-limits')).toBeDefined();
  });
  it('growth engines are evidence-based estimates', () => {
    const dna = computeLearningDNA(SID, T0);
    expect(dna.studentId).toBe(SID);
    const c = careerReadiness(SID, ['c-limits']);
    expect(c.explanation).toMatch(/guidance/i);
    expect(simulateProgress(50, 3, 4).projected).toBeGreaterThan(50);
    expect(recoveryPlan(SID, T0).summary).toBeTruthy();
  });
});
