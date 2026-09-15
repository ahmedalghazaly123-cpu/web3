// ━━━ Voice backend adapter ━━━
// Server-side speech: STT via Groq Whisper, TTS via Groq PlayAI, plus session
// persistence (VoiceSession + VoiceMessage). The browser WebSpeech API stays as
// a fallback so the page still works when the server has no provider key.

import { api } from './api';

const TOKEN_KEY = 'lp-auth-token';

/** Currently playing server-TTS audio, so Stop can actually stop it. */
let currentAudio: HTMLAudioElement | null = null;

export type VoiceLang = 'en' | 'ar';

export const voiceBackend = {
  /** True when a backend session can be created (token present). */
  available(): boolean {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  },

  /** Open a persisted session; returns its id or null when unavailable. */
  async startSession(lang: VoiceLang): Promise<string | null> {
    if (!this.available()) return null;
    try {
      const res = (await api.voice.createSession(lang)) as { session?: { id?: string } };
      return res.session?.id ?? null;
    } catch {
      return null;
    }
  },

  /** Persist learner speech (best-effort: UI never blocks on telemetry). */
  async appendTranscript(sessionId: string | null, text: string, lang: VoiceLang): Promise<void> {
    if (!sessionId) return;
    try {
      await api.voice.appendTranscript(sessionId, text, lang);
    } catch {
      /* telemetry only — the transcript is already in the UI */
    }
  },

  /** Persist the AI answer with its latency. */
  async appendAnswer(sessionId: string | null, content: string, latencyMs?: number): Promise<void> {
    if (!sessionId) return;
    try {
      await api.voice.appendAnswer(sessionId, content, latencyMs);
    } catch {
      /* telemetry only */
    }
  },

  /** Close the session with an optional summary. */
  async closeSession(sessionId: string | null, summary?: string): Promise<void> {
    if (!sessionId) return;
    try {
      await api.voice.closeSession(sessionId, summary);
    } catch {
      /* telemetry only */
    }
  },

  /** Deterministic server-side summary of the stored transcript. */
  async summarize(sessionId: string | null): Promise<string | null> {
    if (!sessionId) return null;
    try {
      const res = (await api.voice.summary(sessionId)) as { summary?: string };
      return res.summary ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Server-side STT for recorded audio. Returns null when the provider is not
   * configured (503) so the caller can fall back to browser recognition.
   */
  async transcribe(blob: Blob, lang: VoiceLang): Promise<{ text: string; provider: string } | null> {
    if (!this.available()) return null;
    try {
      const res = (await api.voice.transcribe(blob, lang)) as { text?: string; provider?: string };
      if (!res?.text) return null;
      return { text: res.text, provider: res.provider ?? 'server' };
    } catch {
      return null;
    }
  },

  /**
   * Speak through the server TTS provider. Returns false when unavailable or
   * blocked by the browser, so the caller can use window.speechSynthesis.
   */
  async speak(text: string, lang: VoiceLang): Promise<boolean> {
    if (!this.available()) return false;
    try {
      const url = await api.voice.synthesize(text.slice(0, 2000), lang);
      if (!url) return false;
      this.stopSpeak();
      const audio = new Audio(url);
      currentAudio = audio;
      const release = () => {
        if (currentAudio === audio) currentAudio = null;
        URL.revokeObjectURL(url);
      };
      audio.addEventListener('ended', release, { once: true });
      await audio.play();
      return true;
    } catch {
      return false;
    }
  },

  /** Stop server TTS playback and any browser speech synthesis. */
  stopSpeak(): void {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.src = '';
      } catch {
        /* noop */
      }
      currentAudio = null;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  },
};