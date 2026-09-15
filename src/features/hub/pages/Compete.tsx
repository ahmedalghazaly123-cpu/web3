import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { useAuth } from '../../../app/layout/AuthProvider';
import { learningSync } from '../../../shared/services/learningSync';
import { collab } from '../../../shared/services/collab';
import { api } from '../../../shared/services/api';
import { Trophy, Users, Server, HardDrive } from 'lucide-react';

type RoomKind = 'study' | 'quiz-battle' | 'code-battle';

export default function CompetePage() {
  const { t, i18n } = useTranslation('hub');
  const { user } = useAuth();
  const studentId = user?.id ?? 'student-local';
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState<RoomKind | null>(null);
  const [serverRooms, setServerRooms] = useState<Array<Record<string, any>>>([]);
  const [authoritative, setAuthoritative] = useState<boolean | null>(null);

  useEffect(() => { if (user?.id) void learningSync.hydrate(user.id); }, [user?.id]);

  useEffect(() => {
    void api.collab.listRooms({ limit: 5 })
      .then((res: any) => setServerRooms(res?.rooms ?? []))
      .catch(() => setServerRooms([]));
  }, []);

  /** Server-authoritative room lifecycle; falls back to the local engine offline. */
  const play = async (kind: RoomKind) => {
    setBusy(kind);
    try {
      const created: any = await api.collab.createRoom({
        kind,
        title: `${kind} room`,
        courseId: 'course-calculus-1',
        privacy: 'invite-only',
        language: i18n.language === 'ar' ? 'ar' : 'en',
      });
      const roomId = created.room.id;
      await api.collab.start(roomId);
      await api.collab.award(roomId, studentId, 10);
      const done: any = await api.collab.finish(roomId);
      setAuthoritative(true);
      setLog((l) => [
        ...l,
        `${t(`roomKind.${kind}`)} ${done.code}: ${t('winner')}: ${done.winner ? `You (10 pts)` : t('noWinner')}`,
      ]);
      const rooms: any = await api.collab.listRooms({ limit: 5 });
      setServerRooms(rooms?.rooms ?? []);
    } catch {
      // Demo/local fallback — same offline behaviour as before.
      setAuthoritative(false);
      const room = collab.createRoom(studentId, kind, `${kind} room`, 'course-calculus-1');
      collab.join(room.id, studentId, user?.name ?? 'You');
      collab.start(room.id);
      collab.award(room.id, studentId, 10);
      const done = collab.finish(room.id);
      const code = done?.code ?? (room.settings as { code?: string } | undefined)?.code ?? '';
      setLog((l) => [
        ...l,
        `${t(`roomKind.${kind}`)} ${code}: ${t('winner')}: ${done?.winner ? 'You (10 pts)' : t('noWinner')}`,
      ]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 pb-10 page-enter max-w-3xl mx-auto">
      <h1 className="display-sm text-text-primary">{t('competeTitle')}</h1>
      <p className="body text-text-secondary">{t('competeSub')}</p>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-semibold text-text-primary">{t('rooms')}</h3>
          {authoritative !== null && (
            <Badge variant={authoritative ? 'success' : 'warning'} size="xs">
              {authoritative ? t('serverScoring') : t('localScoring')}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(['study', 'quiz-battle', 'code-battle'] as const).map((kind) => (
            <Button key={kind} variant="secondary" size="sm" disabled={busy === kind} onClick={() => void play(kind)}>
              {t(`roomKind.${kind}`)}
            </Button>
          ))}
        </div>
        {log.length > 0 && <ul className="mt-3 text-sm text-text-secondary space-y-1">{log.map((m, i) => <li key={i}>&#8226; {m}</li>)}</ul>}
      </Card>
      <Card variant="elevated" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-brand" />
          <h3 className="font-semibold text-text-primary">{t('recentRooms')}</h3>
        </div>
        {serverRooms.length === 0 ? (
          <p className="text-sm text-text-secondary flex items-center gap-2"><HardDrive className="w-4 h-4" />{t('noRooms')}</p>
        ) : (
          <ul className="text-sm text-text-secondary space-y-1">
            {serverRooms.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-primary">{r.title}</span>
                <Badge variant="surface" size="xs">{t(`roomStatus.${r.status}`)}</Badge>
                <span className="text-xs text-text-tertiary">{t('roomCode')}: {r.settings?.code}</span>
                <span className="text-xs text-text-tertiary">{t('membersN', { n: r.memberCount ?? r.members?.length ?? 0 })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card variant="outlined" padding="md">
        <div className="flex items-center gap-2"><Users className="w-4 h-4 text-brand" /><h3 className="font-semibold text-text-primary">{t('fairPlay')}</h3></div>
        <p className="text-sm text-text-secondary mt-1">{t('fairPlayDesc')}</p>
      </Card>
    </div>
  );
}