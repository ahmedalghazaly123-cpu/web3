// Phase 13: Ask-Your-Course retrieval stub (grounded, deterministic).
import type { EntityId } from '../domain';

export interface CourseChunk { id: EntityId; lessonId?: EntityId; text: string; }

const CHUNKS: CourseChunk[] = [
  { id: 'chunk-limits', lessonId: 'lesson-limits', text: 'Limits describe function behavior near a point. Direct substitution works for continuous functions; otherwise factor and cancel.' },
  { id: 'chunk-deriv', lessonId: 'lesson-deriv', text: 'Derivatives measure instantaneous rate of change. Power rule: d/dx[x^n] = n*x^(n-1). Chain rule handles composition.' },
];

function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
}

export interface GroundedAnswer { answer: string; citations: string[]; grounded: boolean; }

export function askCourse(question: string): GroundedAnswer {
  const q = tokens(question);
  let best: CourseChunk | undefined;
  let bestHit = 0;
  for (const c of CHUNKS) {
    const t = tokens(c.text);
    let hit = 0;
    q.forEach((w) => { if (t.has(w)) hit++; });
    if (hit > bestHit) { bestHit = hit; best = c; }
  }
  if (!best || bestHit < 2) {
    return { answer: 'I do not have enough course evidence to answer that.', citations: [], grounded: false };
  }
  return { answer: best.text, citations: [best.id], grounded: true };
}

export const courseRetrieval = { askCourse };
