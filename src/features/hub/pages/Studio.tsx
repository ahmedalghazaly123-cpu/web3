import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { aiStudio } from '../../../shared/services/ai-studio';
import { Mic, Network, FileText } from 'lucide-react';

export default function StudioPage() {
  const { t, i18n } = useTranslation('hub');
  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
  const [transcript, setTranscript] = useState('Limits describe values a function approaches. Direct substitution works unless denominator is zero.');
  const [label, setLabel] = useState('Algebraic Limit Laws');
  const notes = aiStudio.audioToNotes(transcript, lang);
  const map = aiStudio.mindMap(label);
  const pack = aiStudio.generateStudyPack('Limits', lang);
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
