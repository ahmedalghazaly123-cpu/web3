import { describe, it, expect } from 'vitest';
import { voiceService } from '../src/services/voiceService';

/**
 * Voice unit tests — pure logic only, so no database, provider key or HTTP
 * server is needed (the STT/TTS calls themselves require GROQ_API_KEY).
 */
describe('Voice service — deterministic transcript summary', () => {
  it('keeps the first three sentences and drops the rest', () => {
    expect(voiceService.summarizeTranscript('One. Two. Three. Four.', 'en')).toBe('One. Two. Three');
  });

  it('handles Arabic question marks and newlines as separators', () => {
    const out = voiceService.summarizeTranscript('ما النهاية؟ الشرح التالي.\nخلاصة أخيرة.', 'ar');
    expect(out).toBe('ما النهاية. الشرح التالي. خلاصة أخيرة');
  });

  it('returns an empty string for an empty transcript', () => {
    expect(voiceService.summarizeTranscript('', 'en')).toBe('');
  });

  it('collapses repeated separators without producing empty sentences', () => {
    expect(voiceService.summarizeTranscript('A... B!! C', 'en')).toBe('A. B. C');
  });

  it('exposes the full server-side pipeline through the service object', () => {
    expect(typeof voiceService.transcribeAudio).toBe('function');
    expect(typeof voiceService.synthesizeSpeech).toBe('function');
    expect(typeof voiceService.createSession).toBe('function');
    expect(typeof voiceService.listSessions).toBe('function');
  });
});