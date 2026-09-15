// Phase 13: Ask-Your-Course retrieval.
// Primary: real RAG backend (/rag/ask → HuggingFace embeddings + grounded LLM).
// Fallback: keyword matching over demo chunks when RAG is unindexed/unavailable.
import type { EntityId } from '../domain';
import { api } from '../services/api.ts';

export interface CourseChunk { id: EntityId; lessonId?: EntityId; text: string; }

export interface GroundedAnswer { answer: string; citations: string[]; grounded: boolean; model?: string | null; }

function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
}

const DEMO_CHUNKS: CourseChunk[] = [
  { id: 'chunk-limits', lessonId: 'lesson-limits', text: 'Limits describe function behavior near a point. Direct substitution works for continuous functions; otherwise factor and cancel.' },
  { id: 'chunk-deriv', lessonId: 'lesson-deriv', text: 'Derivatives measure instantaneous rate of change. Power rule: d/dx[x^n] = n*x^(n-1). Chain rule handles composition.' },
];

function keywordSearch(question: string, chunks: CourseChunk[]): { chunk: CourseChunk; hit: number } | undefined {
  const q = tokens(question);
  let best: CourseChunk | undefined;
  let bestHit = 0;
  for (const c of chunks) {
    const t = tokens(c.text);
    let hit = 0;
    q.forEach((w) => { if (t.has(w)) hit++; });
    if (hit > bestHit) { bestHit = hit; best = c; }
  }
  if (!best || bestHit < 2) return undefined;
  return { chunk: best, hit: bestHit };
}

export async function askCourse(question: string, courseId?: string): Promise<GroundedAnswer> {
  // Primary: real RAG backend — grounded answer + citations, or no_evidence.
  if (courseId) {
    try {
      const data = await api.rag.ask(question, courseId);
      if (data.grounded && data.answer) {
        return {
          answer: data.answer,
          citations: data.citations ?? [],
          grounded: true,
          model: data.model ?? null,
        };
      }
    } catch {
      // RAG unavailable (404/not indexed/network) → fall through to keyword.
    }
  }

  // Fallback to keyword search on demo chunks (safe when RAG is down/unindexed).
  const chunks = DEMO_CHUNKS;
  const result = keywordSearch(question, chunks);

  if (!result) {
    return { answer: 'I do not have enough course evidence to answer that.', citations: [], grounded: false };
  }

  return { answer: result.chunk.text, citations: [result.chunk.id], grounded: true };
}

export const courseRetrieval = { askCourse };
