import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { ProgressBar } from '../../../shared/components/ui/ProgressBar';
import { useToast } from '../../../shared/components/ui/ToastProvider';
import { useAuth } from '../../../app/layout/AuthProvider';
import { store } from '../../../shared/services/store';
import { masteryEngine } from '../../../shared/services/mastery';
import { knowledgeGraph } from '../../../shared/services/knowledge-graph';
import { learningEngine } from '../../../shared/services/learning-engine';
import { productivity } from '../../../shared/services/productivity';
import { learningSync } from '../../../shared/services/learningSync';
import { BrainCircuit, Mic, MessagesSquare, Search, Network, GraduationCap, Trophy, Timer, Sparkles } from 'lucide-react';

const tiles = [
  { to: '/ai-tutor', icon: <BrainCircuit className="w-5 h-5" />, key: 'aiTutor' },
  { to: '/voice', icon: <Mic className="w-5 h-5" />, key: 'voice' },
  { to: '/ask', icon: <Search className="w-5 h-5" />, key: 'ask' },
  { to: '/studio', icon: <MessagesSquare className="w-5 h-5" />, key: 'studio' },
  { to: '/adaptive', icon: <GraduationCap className="w-5 h-5" />, key: 'adaptive' },
  { to: '/paths', icon: <Network className="w-5 h-5" />, key: 'paths' },
  { to: '/compete', icon: <Trophy className="w-5 h-5" />, key: 'compete' },
  { to: '/focus', icon: <Timer className="w-5 h-5" />, key: 'focus' },
  { to: '/achieve', icon: <Sparkles className="w-5 h-5" />, key: 'achieve' },
];

export default function HubPage() {
  const { t } = useTranslation('hub');
  const toast = useToast();
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (user?.id) void learningSync.hydrate(user.id);
  }, [user?.id]);

  const mastery = store.mastery.listByStudent(studentId);
  const avg = mastery.length ? Math.round(mastery.reduce((a, r) => a + r.mastery, 0) / mastery.length) : 0;
  const due = learningEngine.dueReviews(studentId).length;
  const mistakes = store.mistakes.listByStudent(studentId).length;

  const seed = () => {
    knowledgeGraph.seedDemo();
    // Deterministic demo levels (no Math.random: stable, reviewable seed).
    const levels = [42, 55, 38, 61, 47, 58, 35, 66];
    masteryEngine.seedDemoData(studentId, knowledgeGraph.get().nodes.slice(0, 8).map((n, i) => ({ id: n.id, type: n.type, mastery: levels[i % levels.length] })));
    productivity.bumpStreak(studentId);
    setSeeded(true);
    toast({ variant: 'success', title: t('seeded'), description: t('seededDesc') });
  };

  return (
    <div className="space-y-6 pb-10 page-enter">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-sm text-text-primary">{t('title')}</h1>
          <p className="body text-text-secondary mt-1">{t('subtitle')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={seed}>{seeded ? t('reseed') : t('seed')}</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card variant="elevated" padding="md">
          <p className="text-caption text-text-secondary">{t('avgMastery')}</p>
          <p className="text-2xl font-bold text-text-primary">{avg}%</p>
          <ProgressBar value={avg} variant="brand" size="sm" className="mt-2" />
        </Card>
        <Card variant="elevated" padding="md">
          <p className="text-caption text-text-secondary">{t('dueReviews')}</p>
          <p className="text-2xl font-bold text-text-primary">{due}</p>
          <Link to="/adaptive" className="text-sm text-brand font-medium">{t('reviewNow')} →</Link>
        </Card>
        <Card variant="elevated" padding="md">
          <p className="text-caption text-text-secondary">{t('mistakes')}</p>
          <p className="text-2xl font-bold text-text-primary">{mistakes}</p>
          <Link to="/adaptive" className="text-sm text-brand font-medium">{t('openNotebook')} →</Link>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Link key={tile.to} to={tile.to}>
            <Card variant="elevated" padding="md" className="card-lift h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ai/10 text-ai flex items-center justify-center">{tile.icon}</div>
                <div>
                  <h3 className="font-semibold text-text-primary">{t(`tiles.${tile.key}.title`)}</h3>
                  <p className="text-sm text-text-secondary">{t(`tiles.${tile.key}.desc`)}</p>
                </div>
              </div>
              <div className="mt-3"><Badge variant="ai" size="xs">{t('open')}</Badge></div>
            </Card>
          </Link>
        ))}
      </div>

      {mastery.length === 0 && (
        <EmptyState icon={<BrainCircuit />} title={t('empty')} description={t('emptyDesc')} action={<Button variant="primary" size="sm" onClick={seed}>{t('seed')}</Button>} />
      )}
    </div>
  );
}
