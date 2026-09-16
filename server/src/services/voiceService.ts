/**
 * Real voice pipeline: STT via Groq Whisper, dialog via the free AI cascade,
 * TTS via Groq PlayAI TTS. Browser mic/TTS remain a fallback on the client.
 */
import { prisma } from '../lib/prisma.js';

const GROQ_KEY = process.env.GROQ_API_KEY;
// Groq retired `playai-tts` (Mar 2026 — 400 "has been decommissioned") and its
// replacement is language-specific: Orpheus English / Orpheus Arabic (Saudi).
// Both also need a ONE-TIME terms acceptance in the Groq console, otherwise the
// API answers 400 "requires terms acceptance". Override the ids/voices below if
// Groq renames them again.
const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
const GROQ_TTS_MODEL_EN = process.env.GROQ_TTS_MODEL || 'canopylabs/orpheus-v1-english';
const GROQ_TTS_MODEL_AR = process.env.GROQ_TTS_MODEL_AR || 'canopylabs/orpheus-arabic-saudi';
const GROQ_TTS_VOICE_EN = process.env.GROQ_TTS_VOICE || 'hannah';
const GROQ_TTS_VOICE_AR = process.env.GROQ_TTS_VOICE_AR || 'layla';
/** Console page where the one-time model terms acceptance happens. */
const GROQ_TTS_TERMS_URL = 'https://console.groq.com/playground?model=';

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
  // Each Orpheus model carries its own voice set, so pick model + voice together.
  const model = lang === 'ar' ? GROQ_TTS_MODEL_AR : GROQ_TTS_MODEL_EN;
  const voice = lang === 'ar' ? GROQ_TTS_VOICE_AR : GROQ_TTS_VOICE_EN;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: text.slice(0, 2000),
        voice,
        response_format: 'wav',
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      // The most common cause is a pending one-time terms acceptance — point the
      // operator at the console page instead of leaving a cryptic 400 in the log.
      if (res.status === 400 && /terms acceptance/i.test(detail)) {
        console.warn(
          `[voice] tts ${res.status}: ${detail}\n` +
            `[voice] action required: accept the model terms once at ${GROQ_TTS_TERMS_URL}${encodeURIComponent(model)}`,
        );
      } else {
        console.warn(`[voice] tts ${res.status}: ${detail}`);
      }
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    return { audio: buf, mime: 'audio/wav', provider: `groq-tts:${model}` };
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
