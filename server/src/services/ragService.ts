/**
 * Real RAG service for LearnPilot.
 *
 * Ingestion: course lesson content → text chunks → HuggingFace embeddings
 * (feature-extraction, e.g. intfloat/multilingual-e5-base) stored as JSONB.
 *
 * Retrieval: embed the question, cosine similarity in Node against the
 * course's chunks (no pgvector required), then a grounded answer is produced
 * by the free-provider LLM cascade. Refuses to answer without evidence.
 */
import { prisma } from '../lib/prisma.js';

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
const EMBED_MODEL = process.env.HUGGINGFACE_EMBED_MODEL || 'intfloat/multilingual-e5-base';
const EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBED_MODEL}/pipeline/feature-extraction`;
const LLM_MODEL = process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';
const MAX_CHUNKS_PER_QUERY = 5;
const MIN_SIMILARITY = 0.35;
const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 120;

export interface RetrievedChunk {
  id: string;
  lessonId: string | null;
  chunkIdx: number;
  text: string;
  score: number;
}

// ---------- embeddings ----------

function meanPool(tokenVectors: number[][]): number[] {
  const dim = tokenVectors[0].length;
  const out = new Array(dim).fill(0);
  for (const tv of tokenVectors) for (let i = 0; i < dim; i++) out[i] += tv[i];
  return out.map((v) => v / tokenVectors.length);
}

export async function embed(texts: string[]): Promise<number[][] | null> {
  if (!HF_TOKEN) return null;
  try {
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${HF_TOKEN}` },
      body: JSON.stringify({ inputs: texts, truncate: true }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`[rag] embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') {
      return data as number[][];
    }
    if (Array.isArray(data) && Array.isArray(data[0]) && Array.isArray(data[0][0])) {
      return data.map((tokens: number[][]) => meanPool(tokens));
    }
    console.warn('[rag] unexpected embedding shape:', JSON.stringify(data).slice(0, 200));
    return null;
  } catch (e) {
    console.warn('[rag] embed failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// ---------- chunking ----------

export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + CHUNK_SIZE));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// ---------- ingestion ----------

export async function indexCourse(courseId: string): Promise<{ chunks: number; embedded: boolean }> {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    select: { id: true, title: true, titleAr: true, description: true, content: true },
  });

  await prisma.ragChunk.deleteMany({ where: { courseId } });

  let chunkCount = 0;
  let embedded = false;

  for (const lesson of lessons) {
    const source = [lesson.title, lesson.titleAr, lesson.description, lesson.content]
      .filter(Boolean)
      .join('\n')
      .trim();
    if (!source) continue;
    const pieces = chunkText(source);
    if (!pieces.length) continue;

    const texts = pieces.map((p) => `${lesson.title}: ${p}`);
    const vectors = await embed(texts);
    if (vectors && vectors.length === texts.length) embedded = true;

    await prisma.ragChunk.createMany({
      data: pieces.map((p, i) => ({
        courseId,
        lessonId: lesson.id,
        chunkIdx: i,
        text: p,
        textAr: lesson.titleAr ?? null,
        embedding: vectors?.[i] ? JSON.parse(JSON.stringify(vectors[i])) : undefined,
        embeddingModel: vectors?.[i] ? EMBED_MODEL : null,
      })),
    });
    chunkCount += pieces.length;
  }

  return { chunks: chunkCount, embedded };
}

// ---------- retrieval ----------

export async function retrieve(question: string, courseId: string, limit = MAX_CHUNKS_PER_QUERY): Promise<RetrievedChunk[] | null> {
  const chunks = await prisma.ragChunk.findMany({
    where: { courseId },
    select: { id: true, lessonId: true, chunkIdx: true, text: true, embedding: true },
  });
  if (!chunks.length) return null;

  const [qVec] = (await embed([question])) ?? [null];
  if (!qVec) {
    // Fallback: keyword overlap when embeddings are unavailable
    const qWords = new Set(question.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    return chunks
      .map((c) => {
        const words = new Set(c.text.toLowerCase().split(/\W+/));
        let hits = 0;
        for (const w of qWords) if (words.has(w)) hits++;
        return { id: c.id, lessonId: c.lessonId, chunkIdx: c.chunkIdx, text: c.text, score: hits / (qWords.size || 1) };
      })
      .filter((c) => c.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const scored: RetrievedChunk[] = [];
  for (const c of chunks) {
    if (!Array.isArray(c.embedding)) continue;
    const score = cosine(qVec, c.embedding as number[]);
    if (score >= MIN_SIMILARITY) {
      scored.push({ id: c.id, lessonId: c.lessonId, chunkIdx: c.chunkIdx, text: c.text, score: Number(score.toFixed(4)) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// ---------- grounded answer ----------

export interface GroundedResult {
  answer: string;
  citations: string[];
  grounded: boolean;
  retrieved: RetrievedChunk[];
  model: string | null;
  llmUsed: boolean;
}

export async function askGrounded(question: string, courseId: string): Promise<GroundedResult | { error: 'no_evidence' }> {
  const retrieved = await retrieve(question, courseId);
  if (!retrieved || !retrieved.length) return { error: 'no_evidence' };

  const citations = retrieved.map((r) => r.id);
  const context = retrieved.map((r, i) => `[${i + 1}] ${r.text}`).join('\n\n');

  const prompt = [
    'You are a tutoring assistant. Answer the student question using ONLY the provided course context.',
    'Cite the context chunks you used like [1], [2]. If the context does not contain the answer, say so.',
    '',
    `Course context:\n${context}`,
    '',
    `Student question: ${question}`,
  ].join('\n');

  const llmAnswer = await generateAnswer(prompt);

  const answer =
    llmAnswer !== null
      ? llmAnswer
      : [
          'لم أجد إجابة مولّدة من نموذج لغوي حالياً، لكن هذه المقاطع من منهج الكورس هي الأقرب لسؤالك:',
          ...retrieved.map((r, i) => `[${i + 1}] ${r.text}`),
        ].join('\n\n');

  return { answer, citations, grounded: true, retrieved, model: llmAnswer !== null ? LLM_MODEL : null, llmUsed: llmAnswer !== null };
}

async function generateAnswer(prompt: string): Promise<string | null> {
  if (!HF_TOKEN) return null;
  try {
    const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${HF_TOKEN}` },
      body: JSON.stringify({ model: LLM_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 500 }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.warn(`[rag] llm ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return text ? String(text) : null;
  } catch (e) {
    console.warn('[rag] llm failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export const ragService = { embed, cosine, chunkText, indexCourse, retrieve, askGrounded };
