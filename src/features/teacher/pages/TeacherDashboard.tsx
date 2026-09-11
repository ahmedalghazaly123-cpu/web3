import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { useTranslation } from 'react-i18next';
import { SubmissionsFeed, PerformanceTrend, BroadcastAlerts } from '../components/DashboardExtras';
import {
  BookOpen, Users, TrendingUp, Atom,
  MessageSquare, Plus, BrainCircuit, AlertTriangle,
} from 'lucide-react';

export default function TeacherDashboard() {
  const { t } = useTranslation('teacher');
  const navigate = useNavigate();

  const classes = [
    { id: 1, name: t('classes.calculus'), students: 24, progress: 65, avgScore: 82, tone: 'brand' as const, icon: <BookOpen /> },
    { id: 2, name: t('classes.linearAlgebra'), students: 18, progress: 40, avgScore: 76, tone: 'ai' as const, icon: <Atom /> },
    { id: 3, name: t('classes.physics'), students: 32, progress: 55, avgScore: 89, tone: 'success' as const, icon: <Atom /> },
  ];

  const weakAreas = [
    { topic: t('weak.chainRule'), affected: 8, className: t('classes.calculus'), level: 'high' },
    { topic: t('weak.matrixOps'), affected: 5, className: t('classes.linearAlgebra'), level: 'medium' },
    { topic: t('weak.kinematics'), affected: 12, className: t('classes.physics'), level: 'high' },
  ];

  const suggestions = [
    t('suggestions.chainRule'),
    t('suggestions.matrixOps'),
    t('suggestions.inactiveStudents'),
  ];

  return (
    <div className="space-y-8 pb-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-sm text-text-primary">{t('dashboard')}</h1>
          <p className="body text-text-secondary mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<MessageSquare className="w-4 h-4" />} onClick={() => navigate('/teacher/students')}>
            {t('messages')}
          </Button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/teacher/assignments')}>
            {t('createAssignment')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard value="3" label={t('activeClasses')} icon={<BookOpen />} tone="brand" />
        <StatCard value="74" label={t('totalStudents')} icon={<Users />} tone="success" />
        <StatCard value="82%" label={t('avgClassScore')} icon={<TrendingUp />} tone="warning" />
        <StatCard value="12" label={t('needsAttention')} icon={<AlertTriangle />} tone="error" />
      </div>

      {/* Classes */}
      <div>
        <h2 className="h3 text-text-primary mb-4">{t('myClasses')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id} variant="interactive" padding="lg" glow={cls.tone}>
              <div className="flex items-center gap-3 mb-4">
                <IconBox tone={cls.tone} size="lg">{cls.icon}</IconBox>
                <div>
                  <h3 className="font-semibold text-text-primary">{cls.name}</h3>
                  <p className="text-caption text-text-tertiary">{cls.students} {t('studentsCount')}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t('avg')}: {cls.avgScore}%</span>
                  <span className="text-brand font-semibold">{cls.progress}%</span>
                </div>
                <ProgressBar value={cls.progress} variant="brand" size="sm" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center gap-3 mb-4">
            <IconBox tone="error" size="md"><AlertTriangle /></IconBox>
            <h2 className="h3 text-text-primary">{t('weakAreas')}</h2>
          </div>
          <div className="space-y-3">
            {weakAreas.map((area, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-surface-border">
                <div>
                  <p className="font-medium text-text-primary">{area.topic}</p>
                  <p className="text-sm text-text-tertiary">{area.className}</p>
                </div>
                <Badge variant={area.level === 'high' ? 'error' : 'warning'} size="sm">{area.affected} {t('studentsCount')}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="elevated" padding="lg" glow="ai">
          <div className="flex items-center gap-3 mb-4">
            <IconBox tone="ai" size="md"><BrainCircuit /></IconBox>
            <h2 className="h3 text-text-primary">{t('aiCopilot')}</h2>
          </div>
          <p className="body-sm text-text-secondary mb-4">{t('aiInsightsDesc')}</p>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <Suggestion key={i} text={s} />
            ))}
          </div>
          <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-ai bg-ai-bg border border-ai-border rounded-lg hover:bg-ai/10 transition-colors">
            <MessageSquare className="w-4 h-4" />
            {t('askCopilot')}
          </button>
        </Card>
      </div>

      {/* ━━━─ Submissions · Performance trend · Broadcast ━━━─ */}
      <div className="grid lg:grid-cols-2 gap-6">
        <SubmissionsFeed />
        <PerformanceTrend />
      </div>
      <BroadcastAlerts />
    </div>
  );
}

function StatCard({ value, label, icon, tone }: { value: string; label: string; icon: React.ReactNode; tone?: 'brand' | 'success' | 'warning' | 'error' | 'ai' }) {
  return (
    <Card variant="elevated" padding="md" className="card-lift">
      <div className="flex items-center gap-3">
        <IconBox tone={tone} size="md">{icon}</IconBox>
        <div>
          <span className="text-2xl font-bold text-text-primary">{value}</span>
          <p className="text-caption text-text-tertiary">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function Suggestion({ text }: { text: string }) {
  return (
    <div className="p-3 bg-surface-secondary rounded-lg flex items-start gap-2 border border-surface-border">
      <BrainCircuit className="w-4 h-4 text-ai mt-0.5 flex-shrink-0" />
      <p className="text-sm text-text-secondary">{text}</p>
    </div>
  );
}
