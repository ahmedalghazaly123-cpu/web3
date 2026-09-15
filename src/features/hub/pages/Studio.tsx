import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { aiStudio } from '../../../shared/services/ai-studio';
import { sandbox, type SandboxLanguage, type SandboxRunResult } from '../../../shared/services/sandbox';
import { Mic, Network, FileText, Code2, Play, Loader2 } from 'lucide-react';

const STARTER_CODE: Record<SandboxLanguage, string> = {
  js: "const limits = [1, 0.5, 0.1].map((h) => (1 - Math.cos(h)) / h);\nconsole.log(limits);\nlimits[limits.length - 1];",
  python: "h = [1, 0.5, 0.1]\nimport math\nlimits = [(1 - math.cos(x)) / x for x in h]\nprint(limits)\nlimits[-1]",
};

export default function StudioPage() {
  const { t, i18n } = useTranslation('hub');
  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
  const [transcript, setTranscript] = useState('Limits describe values a function approaches. Direct substitution works unless denominator is zero.');
  const [label, setLabel] = useState('Algebraic Limit Laws');
  const notes = aiStudio.audioToNotes(transcript, lang);
  const map = aiStudio.mindMap(label);
  const pack = aiStudio.generateStudyPack('Limits', lang);

  // ── Code Lab: real server-side execution (node:vm / python child process) ──
  const [codeLang, setCodeLang] = useState<SandboxLanguage>('js');
  const [code, setCode] = useState(STARTER_CODE.js);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<SandboxRunResult | null>(null);

  const switchLang = (next: SandboxLanguage) => {
    setCodeLang(next);
    setCode(STARTER_CODE[next]);
    setRunResult(null);
  };

  const runCode = async () => {
    setRunning(true);
    try {
      setRunResult(await sandbox.run(codeLang, code, 2000));
    } finally {
      setRunning(false);
    }
  };
  return (
    <div className="space-y-6 pb-10 page-enter max-w-4xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('studioTitle')}</h1>
      <p className="body text-text-secondary">{t('studioSub')}</p>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><Mic className="w-4 h-4 text-ai" /><h3 className="font-semibold text-text-primary">{t('audioNotes')}</h3></div>
        <textarea rows={3} value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full p-3 rounded-xl border border-surface-border bg-surface text-sm text-text-primary" />
        <p className="text-sm text-text-secondary mt-2"><strong>{t('summary')}:</strong> {notes.summary}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">{notes.keywords.map((k) => <Badge key={k} variant="ai" size="xs">{k}</Badge>)}</div>
      </Card>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><Network className="w-4 h-4 text-brand" /><h3 className="font-semibold text-text-primary">{t('mindMap')}</h3></div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={t('mindMap')} className="mb-2 w-full p-2 rounded-lg border border-surface-border bg-surface text-sm text-text-primary" />
        <MindNode label={String(map.label)} depth={0} children={(map.children as { id: string; label: string }[])} />
      </Card>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-success" /><h3 className="font-semibold text-text-primary">{t('teacherPack')}</h3><Badge variant="warning" size="xs">{t('needsReview')}</Badge></div>
        <p className="text-sm text-text-secondary">{pack.summary}</p>
      </Card>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-2">
          <Code2 className="w-4 h-4 text-ai" />
          <h3 className="font-semibold text-text-primary">{t('codeLab')}</h3>
          <Badge variant="ai" size="xs">{t('sandboxReal')}</Badge>
        </div>
        <p className="text-sm text-text-secondary mb-3">{t('codeLabSub')}</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {(['js', 'python'] as const).map((l) => (
            <Button key={l} variant={codeLang === l ? 'primary' : 'secondary'} size="xs" onClick={() => switchLang(l)}>
              {l === 'js' ? 'JavaScript' : 'Python'}
            </Button>
          ))}
        </div>
        <label className="text-sm font-medium text-text-primary" htmlFor="sandbox-code">{t('code')}</label>
        <textarea
          id="sandbox-code"
          rows={6}
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-2 w-full p-3 rounded-xl border border-surface-border bg-surface text-sm font-mono text-text-primary"
        />
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Button variant="ai" size="md" onClick={runCode} disabled={running || !code.trim()}>
            {running ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Play className="w-4 h-4 me-2" />}
            {running ? t('running') : t('runCode')}
          </Button>
          {runResult && !running && (
            <Badge variant={runResult.ok ? 'success' : 'error'} size="xs">{t(`runStatus.${runResult.status}`)}</Badge>
          )}
          {runResult && !running && <span className="text-xs text-text-tertiary">{runResult.durationMs} ms</span>}
        </div>
        {runResult && !running && (
          <div className="mt-3">
            <p className="text-xs font-medium text-text-secondary mb-1">{t('output')}</p>
            <pre className="p-3 rounded-xl bg-surface-secondary text-xs text-text-primary overflow-auto max-h-56 whitespace-pre-wrap">
              {[
                ...runResult.stdout,
                runResult.result ? `→ ${runResult.result}` : '',
                runResult.stderr,
              ].filter(Boolean).join('\n') || t('noOutput')}
            </pre>
            {runResult.reason && <p className="text-xs text-warning mt-1">{runResult.reason}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

function MindNode({ label, depth, children }: { label: string; depth: number; children?: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(depth < 1);
  return (
    <div className={depth > 0 ? 'ms-4 border-s-2 border-surface-border ps-3 mt-2' : ''}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-sm font-medium text-text-primary hover:text-brand">
        {children?.length ? (open ? '▾ ' : '▸ ') : '• '}{label}
      </button>
      {open && children?.map((c) => <MindNode key={c.id} label={c.label} depth={depth + 1} />)}
    </div>
  );
}
