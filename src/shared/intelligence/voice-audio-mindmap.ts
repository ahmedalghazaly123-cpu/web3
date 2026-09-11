// Phases 14-16: voice, audio-notes, mind-maps (honest stubs with contracts).
import type { EntityId, MindMapNode } from '../domain';
import { knowledgeGraph } from '../services/knowledge-graph.ts';

export interface VoiceSession { id: EntityId; studentId: EntityId; language: 'en' | 'ar'; status: string; transcript: string; }
export function startVoiceSession(studentId: EntityId, language: 'en' | 'ar' = 'en'): VoiceSession {
  return { id: `voice-${studentId}-${language}`, studentId, language, status: 'listening (browser STT required)', transcript: '' };
}

export interface AudioNotes { transcript: string; keyPoints: string[]; summary: string; actionItems: string[]; concepts: EntityId[]; }
export function audioToNotes(transcript: string): AudioNotes {
  const sentences = transcript.split(/(?<=[.!?])\s+/).filter(Boolean);
  const keyPoints = sentences.slice(0, 5);
  const concepts = knowledgeGraph.get().nodes.filter((n) => transcript.toLowerCase().includes(n.label.toLowerCase())).map((n) => n.id).slice(0, 5);
  return {
    transcript,
    keyPoints,
    summary: keyPoints.slice(0, 2).join(' '),
    actionItems: keyPoints.length ? [`Review: ${keyPoints[0].slice(0, 80)}`] : [],
    concepts,
  };
}

export function graphToMindMap(rootId: EntityId): MindMapNode[] {
  const g = knowledgeGraph.get();
  const root = knowledgeGraph.getNode(rootId);
  if (!root) return [];
  const kids = g.edges.filter((e) => e.source === rootId || e.target === rootId)
    .flatMap((e) => [e.source, e.target]).filter((id) => id !== rootId);
  return [{ id: root.id, label: root.label, kind: 'concept', children: [...new Set(kids)] }];
}

export const voiceEngine = { startVoiceSession };
export const audioNotesEngine = { audioToNotes };
export const mindMapEngine = { graphToMindMap };
