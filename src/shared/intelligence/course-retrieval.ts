// Phase 13: Ask-Your-Course retrieval with real pgvector similarity search.
// Falls back to keyword matching in demo mode.
import type { EntityId } from '../domain';
import { api } from '../services/api.ts';
import { featureFlags } from '../services/feature-flags.ts';

export interface CourseChunk { id: EntityId; lessonId?: EntityId; text: string; }

export interface GroundedAnswer { answer: string; citations: string[]; grounded: boolean; }

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

async function vectorSearch(question: string, courseId?: string): Promise<CourseChunk[] | null> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('lp-auth-token') : null;
  if (!token) return null;

  try {
    const res = await fetch(
      `${api.baseURL()}/learning/rag/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: question, courseId, limit: 5 }),
      },
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.chunks as CourseChunk[];
  } catch {
    return null;
  }
}

export async function askCourse(question: string, courseId?: string): Promise<GroundedAnswer> {
  // Try real pgvector search first if authenticated
  if (featureFlags.isEnabled('semantic_search')) {
    const chunks = await vectorSearch(question, courseId);
    if (chunks && chunks.length > 0) {
      return {
        answer: chunks.map((c) => c.text).join(' '),
        citations: chunks.map((c) => c.id),
        grounded: true,
      };
    }
  }

  // Fallback to keyword search on demo chunks (or stored chunks)
  const chunks = DEMO_CHUNKS;
  const result = keywordSearch(question, chunks);

  if (!result) {
    return { answer: 'I do not have enough course evidence to answer that.', citations: [], grounded: false };
  }

  return { answer: result.chunk.text, citations: [result.chunk.id], grounded: true };
}

export const courseRetrieval = { askCourse };
