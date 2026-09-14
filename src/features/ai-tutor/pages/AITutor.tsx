import { useState, useRef, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '../../../shared/components/ui/Badge';
import { Avatar } from '../../../shared/components/ui/Avatar';
import { Card } from '../../../shared/components/ui/Card';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { aiGateway } from '../../../shared/services/ai-gateway';
import { store } from '../../../shared/services/store';
import { BrainCircuit, Send, Paperclip, Mic, Sparkles, Lightbulb, HelpCircle, ListChecks, FileText, BookOpen, Target, History } from 'lucide-react';

interface AIMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  type?: 'text' | 'structured' | 'solution';
  citations?: string[];
}

const quickActions = [
  { key: 'explain', icon: <Lightbulb className="w-4 h-4" />, tone: 'ai' as const },
  { key: 'hint', icon: <HelpCircle className="w-4 h-4" />, tone: 'brand' as const },
  { key: 'quiz', icon: <ListChecks className="w-4 h-4" />, tone: 'info' as const },
  { key: 'summarize', icon: <FileText className="w-4 h-4" />, tone: 'accent' as const },
  { key: 'practice', icon: <Target className="w-4 h-4" />, tone: 'success' as const },
  { key: 'context', icon: <BookOpen className="w-4 h-4" />, tone: 'warning' as const },
];

export default function AITutorPage() {
  const { t, i18n } = useTranslation('ai-tutor');
  const { user } = useAuth();
  const sid = user?.id ?? 'student-local';
  useEffect(() => { if (user?.id) void learningSync.hydrate(user.id); }, [user?.id]);
  const [mode, setMode] = useState<'explain' | 'hint' | 'socratic' | 'step-by-step' | 'exam-prep' | 'revision'>('explain');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const convos = store.conversations.listByStudent(sid);
  const seedMessages = useMemo<AIMessage[]>(() => [
    {
      id: '1',
      role: 'ai',
      type: 'structured',
      content: t('seed.ai'),
      timestamp: new Date(Date.now() - 60000),
      citations: [t('seed.aiCitation')],
    },
    {
      id: '2',
      role: 'user',
      content: t('seed.user'),
      timestamp: new Date(Date.now() - 30000),
    },
  ], [t, i18n.language]);
  const [newMessages, setNewMessages] = useState<AIMessage[]>([]);
  const messages = [...seedMessages, ...newMessages];

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;
    const userText = inputValue;
    const newMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    setNewMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setLoading(true);
    try {
      const res = await aiGateway.send({ prompt: userText, mode, courseId: 'calculus-1', lessonId: 'l3', studentId: sid, language: i18n.language as 'en' | 'ar' });
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        type: 'structured',
        content: res.content,
        timestamp: new Date(),
        citations: ['Stewart, Calculus: Early Transcendentals, §2.3'],
      };
      setNewMessages((prev) => [...prev, aiResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (key: string) => {
    const actionMap: Record<string, string> = {
      explain: t('suggestedActions.explain'),
      hint: t('suggestedActions.hint'),
      quiz: t('suggestedActions.test'),
      summarize: t('suggestedActions.summarize'),
      practice: t('prompts.practice'),
      context: t('prompts.context'),
    };
    setInputValue(actionMap[key] || '');
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col lg:flex-row page-enter">
      {/* ━━━─ Sidebar: Context & Quick Actions ━━━─ */}
      <aside className="hidden lg:flex w-72 flex-col border-e border-surface-border bg-surface-secondary/40 p-4 gap-4">
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-2 mb-2">
            <IconBox tone="brand" size="sm"><BookOpen /></IconBox>
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">{t('context.title')}</span>
          </div>
          <p className="text-sm font-medium text-text-primary">{t('context.course')}</p>
          <p className="text-caption text-text-secondary mt-0.5">{t('context.courseTopic')}</p>
          <div className="mt-3 pt-3 border-t border-surface-border">
            <p className="text-caption text-text-tertiary">{t('context.lesson')}</p>
            <p className="text-sm font-medium text-brand mt-0.5">{t('context.lessonName')}</p>
          </div>
        </Card>

        <div>
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 px-1">{t('quickActionsTitle')}</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.key}
                onClick={() => handleQuickAction(action.key)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-surface-border bg-surface hover:border-surface-border-hover hover:bg-surface-secondary transition-all text-center group"
              >
                <IconBox tone={action.tone} size="sm">{action.icon}</IconBox>
                <span className="text-[10px] font-medium text-text-secondary group-hover:text-text-primary leading-tight">
                  {t(`quickActions.${action.key}`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Card variant="outlined" padding="sm" className="mt-auto bg-ai-bg/30 border-ai/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-ai" />
            <span className="text-xs font-semibold text-ai">{t('capabilities.title')}</span>
          </div>
          <ul className="space-y-1.5 text-caption text-text-secondary">
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-ai"></span>{t('capabilities.steps')}</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-ai"></span>{t('capabilities.hints')}</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-ai"></span>{t('capabilities.practice')}</li>
            <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-ai"></span>{t('capabilities.weakness')}</li>
          </ul>
        </Card>
      </aside>

      {/* ━━━─ Main Chat Area ━━━─ */}
      <div className="flex-1 flex flex-col min-w-0">
      {/* ━━━─ AI Tutor Header ━━━─ */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-ai flex items-center justify-center shadow-sm">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="h3 text-text-primary">{t('title')}</h1>
            <p className="text-caption text-text-secondary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-success rounded-full pulse-dot inline-block"></span>
              {t('subtitle')} · {t('status.online')}
            </p>
          </div>
        </div>
        <Badge variant="ai" size="sm" className="gap-1">
          <Sparkles className="w-3 h-3" />
          {t('workspaceBadge')}
        </Badge>
        <div className="flex items-center gap-1">
          <button onClick={() => setHistoryOpen((o) => !o)} aria-expanded={historyOpen} aria-label="history"
            className="p-2 rounded-lg text-text-tertiary hover:text-ai hover:bg-ai/10"><History className="w-4 h-4" /></button>
          <Link to="/ask" className="p-2 rounded-lg text-text-tertiary hover:text-ai hover:bg-ai/10" aria-label="ask"><BookOpen className="w-4 h-4" /></Link>
          <button aria-label="save" className="p-2 rounded-lg text-text-tertiary hover:text-ai hover:bg-ai/10"><BookOpen className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="px-6 pt-3 flex flex-wrap gap-1.5 bg-surface border-b border-surface-border" role="tablist" aria-label="modes">
        {(['explain', 'hint', 'socratic', 'step-by-step', 'exam-prep', 'revision'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${mode === m ? 'bg-ai text-white' : 'bg-surface-secondary text-text-secondary hover:text-text-primary'}`}>
            {m}
          </button>
        ))}
        {historyOpen && (
          <div className="w-full py-2 text-xs text-text-secondary">
            {convos.length === 0 ? 'No saved conversations yet — chats persist locally.' : convos.map((c) => <span key={c.id} className="me-2 inline-block px-2 py-0.5 rounded bg-surface-secondary">{c.title}</span>)}
          </div>
        )}
      </div>

      {/* ━━━─ Conversation ━━━─ */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" aria-live="polite">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && <p className="text-caption text-text-tertiary animate-pulse">AI is thinking…</p>}
      </div>

      {/* ━━━─ Suggested Actions (Mobile) ━━━─ */}
      <div className="px-6 py-3 border-t border-surface-border bg-surface-secondary/50 lg:hidden">
        <div className="flex flex-wrap gap-2">
          {quickActions.slice(0, 4).map((action) => (
            <button
              key={action.key}
              onClick={() => handleQuickAction(action.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface border border-surface-border text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
            >
              {action.icon}
              {t(`quickActions.${action.key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ━━━─ Input Composer ━━━─ */}
      <div className="p-4 border-t border-surface-border bg-surface">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('inputPlaceholder')}
            className="w-full px-4 py-3 pe-12 ps-20 text-sm bg-surface-secondary border border-surface-border rounded-xl focus:outline-none focus:border-ai focus:ring-2 focus:ring-ai/20 resize-none transition-all"
            rows={2}
          />
          <div className="absolute inset-y-0 start-3 flex items-center gap-1">
            <button type="button" className="p-1.5 text-text-tertiary hover:text-ai rounded-lg hover:bg-ai/10 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button type="button" className="p-1.5 text-text-tertiary hover:text-ai rounded-lg hover:bg-ai/10 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="absolute inset-y-0 end-2 flex items-center justify-center w-9 h-9 rounded-lg bg-ai text-white hover:bg-ai/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-caption text-text-tertiary">
          <span>{t('inputHint')}</span>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-ai" />
            <span>{t('poweredBy')}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AIMessage }) {
  const { t } = useTranslation('ai-tutor');
  const isAI = message.role === 'ai';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      <Avatar
        src={isAI ? undefined : '/avatars/student.svg'}
        name={isAI ? t('title') : t('you')}
        size="sm"
        status={isAI ? 'online' : 'none'}
        className={isAI ? 'bg-ai/10 text-ai ring-2 ring-ai/20' : 'bg-brand/10 text-brand ring-2 ring-brand/20'}
      >
        {isAI && <BrainCircuit className="w-5 h-5 text-ai" />}
      </Avatar>
      <div className={`max-w-[80%] ${isAI ? '' : 'text-end'}`}>
        <div className={`rounded-2xl px-4 py-3 inline-block text-start ${
          isAI
            ? 'bg-surface-secondary border border-surface-border rounded-ts-none'
            : 'bg-brand text-white rounded-te-none'
        }`}>
          {message.type === 'structured' && isAI ? (
            <StructuredMessage content={message.content} citations={message.citations} />
          ) : (
            <div className={`prose prose-sm max-w-none ${isAI ? '' : 'text-white'}`} dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />
          )}
        </div>
        <div className="text-caption text-text-tertiary mt-1">
          {time}
        </div>
        {isAI && message.citations && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {message.citations.map((cite, i) => (
              <Badge key={i} variant="ai" size="xs">
                <Sparkles className="w-2.5 h-2.5 me-1" />
                {cite.split(',')[0]}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StructuredMessage({ content, citations }: { content: string; citations?: string[] }) {
  const { t } = useTranslation('ai-tutor');
  // Parse markdown-like content
  const lines = content.split('\n');
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return <h3 key={i} className="text-sm font-semibold text-text-primary">{trimmed.replace(/\*\*/g, '')}</h3>;
        }
        if (trimmed.startsWith('**')) {
          return <h4 key={i} className="text-xs font-semibold text-text-primary mt-3 mb-1">{trimmed.replace(/\*\*/g, '')}</h4>;
        }
        if (trimmed.startsWith('`')) {
          return null; // Skip code fences for now
        }
        if (trimmed) {
          return <p key={i} className="text-sm text-text-secondary leading-relaxed">{formatLine(trimmed)}</p>;
        }
        return null;
      })}
      {citations && (
        <div className="border-t border-surface-border pt-2 mt-3">
          <div className="text-xs text-text-tertiary">
            {t('sources')}: {citations.join('; ')}
          </div>
        </div>
      )}
    </div>
  );
}

function formatContent(content: string): string {
  // Simple markdown to HTML
  return content
.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
.replace(/`(.*?)`/g, '<code>$1</code>')
}

function formatLine(line: string): string {
  return line
.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
.replace(/`(.*?)`/g, '<code>$1</code>')
}
