/**
 * Real voice pipeline: STT via Groq Whisper, dialog via the free AI cascade,
 * TTS via Groq PlayAI TTS. Browser mic/TTS remain a fallback on the client.
 */
import { prisma } from '../lib/prisma.js';

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
const GROQ_TTS_MODEL = process.env.GROQ_TTS_MODEL || 'playai-tts';
const GROQ_TTS_VOICE = process.env.GROQ_TTS_VOICE || 'Fritz-PlayAI';

export type VoiceLang = 'en' | 'ar';

export async function transcribeAudio(audio: Buffer, filename: string, mime: string, lang: VoiceLang): Promise<{ text: string; provider: string } | null> {
  if (!GROQ_KEY) return null;
  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio)], { type: mime || 'audio/webm' }), filename || 'audio.webm');
    form.append('model', GROQ_STT_MODEL);
    form.append('language', lang === 'ar' ? 'ar' : 'en');
    form.append('response_format', 'json');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.warn(`[voice] stt ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    const text = String(data.text ?? '').trim();
    if (!text) return null;
    return { text, provider: 'groq-whisper' };
  } catch (e) {
    console.warn('[voice] stt failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function synthesizeSpeech(text: string, lang: VoiceLang): Promise<{ audio: Buffer; mime: string; provider: string } | null> {
  if (!GROQ_KEY) return null;
  // PlayAI voices are mostly English; an Arabic voice can be configured with
  // GROQ_TTS_VOICE_AR. When no Arabic voice is set, the client falls back to the
  // browser speech synthesis for `ar`.
  const voice = lang === 'ar' ? (process.env.GROQ_TTS_VOICE_AR || GROQ_TTS_VOICE) : GROQ_TTS_VOICE;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_TTS_MODEL,
        input: text.slice(0, 2000),
        voice,
        response_format: 'wav',
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      console.warn(`[voice] tts ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return { audio: buf, mime: 'audio/wav', provider: 'groq-tts' };
  } catch (e) {
    console.warn('[voice] tts failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function createSession(studentId: string, language: VoiceLang) {
  return prisma.voiceSession.create({ data: { studentId, language: language === 'ar' ? 'AR' : 'EN' } });
}

/** Load a session and enforce ownership (404 and 403 stay distinguishable). */
async function requireOwnSession(id: string, ownerId: string) {
  const s = await prisma.voiceSession.findUnique({ where: { id } });
  if (!s) throw new Error('not-found');
  if (s.studentId !== ownerId) throw new Error('forbidden');
  return s;
}

export async function getSession(id: string, studentId: string) {
  await requireOwnSession(id, studentId);
  return prisma.voiceSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function appendTranscript(sessionId: string, ownerId: string, text: string) {
  const s = await requireOwnSession(sessionId, ownerId);
  const transcript = s.transcript ? `${s.transcript} ${text}` : text;
  await prisma.voiceSession.update({ where: { id: sessionId }, data: { transcript } });
  await prisma.voiceMessage.create({ data: { sessionId, role: 'USER', content: text } });
  return transcript;
}

export async function appendAnswer(sessionId: string, ownerId: string, content: string, latencyMs?: number) {
  await requireOwnSession(sessionId, ownerId);
  await prisma.voiceMessage.create({ data: { sessionId, role: 'AI', content, latencyMs } });
}

export async function closeSession(sessionId: string, ownerId: string, summary?: string) {
  await requireOwnSession(sessionId, ownerId);
  return prisma.voiceSession.update({
    where: { id: sessionId },
    data: { status: 'CLOSED', closedAt: new Date(), summary },
  });
}

/** Session history for the owner (newest first). */
export async function listSessions(studentId: string, limit = 20) {
  return prisma.voiceSession.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true, language: true, status: true, summary: true, createdAt: true, closedAt: true },
  });
}

export function summarizeTranscript(transcript: string, _lang: VoiceLang): string {
  const sentences = transcript.split(/[.!؟。\n]+/).map((s) => s.trim()).filter(Boolean);
  // Arabic uses the same full stop character as English — join consistently.
  return sentences.slice(0, 3).join('. ');
}

export const voiceService = {
  transcribeAudio,
  synthesizeSpeech,
  createSession,
  getSession,
  appendTranscript,
  appendAnswer,
  closeSession,
  listSessions,
  summarizeTranscript,
};
