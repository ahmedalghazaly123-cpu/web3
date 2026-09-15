import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { aiStudio } from '../../../shared/services/ai-studio';
import { featureFlags } from '../../../shared/services/feature-flags';
import { voiceBackend } from '../../../shared/services/voice';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertTriangle, Upload } from 'lucide-react';

export default function VoicePage() {
  const { t, i18n } = useTranslation('hub');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';
  useEffect(() => { if (user?.id) void learningSync.hydrate(user.id); }, [user?.id]);

  const voiceLang = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState(1);
  const enabled = featureFlags.isEnabled('voice_ai');
  const support = aiStudio.voiceSupport();

  // Server-side voice: a persisted VoiceSession + real STT/TTS when configured.
  // The browser WebSpeech API remains the fallback (see `support`).
  const serverVoice = voiceBackend.available();
  const sessionRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!serverVoice) return;
    void voiceBackend.startSession(voiceLang).then((id) => {
      sessionRef.current = id;
      setSessionId(id);
    });
    return () => { void voiceBackend.closeSession(sessionRef.current); };
  }, [serverVoice, voiceLang]);

  const toggleListen = () => {
    type Rec = { lang: string; onresult: ((e: { results: { transcript: string }[][] }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
    const Rec: (new () => Rec) | undefined = (window as unknown as Record<string, (new () => Rec) | undefined>).SpeechRecognition ?? (window as unknown as Record<string, (new () => Rec) | undefined>).webkitSpeechRecognition;
    if (!Rec || listening) { setListening(false); return; }
    try {
      const rec = new Rec();
      rec.lang = voiceLang === 'ar' ? 'ar-SA' : 'en-US';
      rec.onresult = (e) => {
        const text = e.results[e.results.length - 1]?.[0]?.transcript ?? '';
        setTranscript((prev) => (prev ? `${prev} ${text}` : text));
      };
      rec.onend = () => setListening(false);
      rec.start();
      setListening(true);
    } catch { setListening(false); }
  };

  const ask = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    const startedAt = performance.now();
    try {
      await voiceBackend.appendTranscript(sessionRef.current, transcript, voiceLang);
      const r = await aiStudio.askCourse(studentId, 'calculus-1', transcript);
      setAnswer(r.answer);
      void voiceBackend.appendAnswer(sessionRef.current, r.answer, Math.round(performance.now() - startedAt));
      // Prefer the server voice; fall back to the browser voice.
      const spokenByServer = await voiceBackend.speak(r.answer, voiceLang);
      if (!spokenByServer && support.tts) aiStudio.speak(r.answer.slice(0, 400), voiceLang, rate);
      if (!spokenByServer && !support.tts) setNotice(t('noTts'));
    } finally { setLoading(false); }
  };

  /** Upload a recording and transcribe it server-side (real STT provider). */
  const transcribeFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const res = await voiceBackend.transcribe(file, voiceLang);
      if (!res) { setNotice(t('sttUnavailable')); return; }
      setTranscript((prev) => (prev ? `${prev} ${res.text}` : res.text));
    } finally { setUploading(false); }
  };

  if (!enabled) return <EmptyState icon={<MicOff />} title={t('voiceOff')} description={t('voiceOffDesc')} className="py-16" />;

  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <div>
        <h1 className="display-sm text-text-primary">{t('voiceTitle')}</h1>
        <p className="body text-text-secondary mt-1">{t('voiceSub')}</p>
      </div>
      {!support.stt && (
        <Card variant="outlined" padding="md" className="flex gap-2 items-start border-warning/30 bg-warning-bg">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
          <p className="text-sm text-text-secondary">{serverVoice ? t('noSttServerInstead') : t('noStt')}</p>
        </Card>
      )}
      <Card variant="elevated" padding="lg" className="text-center">
        <button onClick={toggleListen} aria-pressed={listening} aria-label={t('voiceTitle')}
          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all ${listening ? 'bg-error text-white animate-pulse' : 'bg-ai text-white hover-lift'}`}>
          {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>
        <p className="mt-3 font-medium text-text-primary">{listening ? t('listening') : t('tapToSpeak')}</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-secondary">
          <label htmlFor="rate">{t('speed', { n: rate })}</label>
          <input id="rate" type="range" min={0.5} max={1.5} step={0.25} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          <Button variant="secondary" size="xs" onClick={() => { voiceBackend.stopSpeak(); aiStudio.stopSpeak(); }} leftIcon={<VolumeX className="w-3 h-3" />}>{t('stop')}</Button>
          <Badge variant="ai" size="xs"><Volume2 className="w-3 h-3 me-1" />{support.tts || serverVoice ? 'TTS' : t('textOnly')}</Badge>
        </div>
      </Card>
      <Card variant="elevated" padding="md">
        <label className="text-sm font-medium text-text-primary" htmlFor="voice-text">{t('transcript')}</label>
        <textarea id="voice-text" rows={3} value={transcript} onChange={(e) => setTranscript(e.target.value)}
          placeholder={t('voicePlaceholder')} className="mt-2 w-full p-3 rounded-xl border border-surface-border bg-surface text-text-primary" />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Button variant="ai" size="md" onClick={ask} disabled={loading || !transcript.trim()}>{loading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}{t('askVoice')}</Button>
          {serverVoice && (
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? t('transcribing') : t('uploadAudio')}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => { void transcribeFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
          )}
          {sessionId && <Badge variant="surface" size="xs">{t('sessionSaved')}</Badge>}
        </div>
        {notice && <p className="mt-2 text-xs text-warning">{notice}</p>}
        {answer && <div className="mt-4 p-3 rounded-xl bg-surface-secondary text-sm text-text-secondary leading-relaxed">{answer}</div>}
      </Card>
    </div>
  );
}
