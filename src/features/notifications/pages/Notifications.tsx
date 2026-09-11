import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../shared/components/ui/Button';
import { Card } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { IconBox } from '../../../shared/components/ui/IconBox';
import { cn } from '../../../shared/lib/utils';
import { Bell, BookOpen, Clock, User, AlertCircle, CheckCheck } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  read: boolean;
  time: string;
}

const readSeed = ['3', '4', '5'];

const categoryIcons = {
  learning: <BookOpen className="w-4 h-4 text-brand" />,
  ai: <AlertCircle className="w-4 h-4 text-ai" />,
  assessment: <Clock className="w-4 h-4 text-warning" />,
  system: <User className="w-4 h-4 text-text-tertiary" />,
};

export default function NotificationsPage() {
  const { t } = useTranslation('notifications');
  const items = t('items', { returnObjects: true }) as NotificationItem[];
  const [readIds, setReadIds] = useState<Set<string>>(new Set(readSeed));
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const notifications = items.map((n) => ({ ...n, read: readIds.has(n.id) }));
  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = activeTab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const markAsRead = (id: string | number) => {
    setReadIds((prev) => new Set(prev).add(String(id)));
  };

  const markAllRead = () => {
    setReadIds(new Set(items.map((n) => n.id)));
  };

  return (
    <div className="space-y-6 pb-8 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="display-sm text-text-primary">{t('nav.notifications')}</h1>
            <p className="text-caption text-text-secondary">
              {unreadCount > 0 ? t('subtitleUnread', { count: unreadCount }) : t('subtitleCaughtUp')}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" leftIcon={<CheckCheck className="w-4 h-4" />} onClick={markAllRead}>
            {t('markAllRead')}
          </Button>
        )}
      </div>

      <div className="flex gap-2 bg-surface border border-surface-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
            activeTab === 'all' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:bg-surface-secondary',
          )}
        >
          {t('tabs.all')}
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
            activeTab === 'unread' ? 'bg-brand text-white shadow-sm' : 'text-text-secondary hover:bg-surface-secondary',
          )}
        >
          {t('tabs.unread')}
          {unreadCount > 0 && (
            <span className={cn('min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs leading-none flex items-center justify-center',
              activeTab === 'unread' ? 'bg-white text-brand' : 'bg-brand-bg text-brand')}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            tone="brand"
            title={t('empty.title')}
            description={activeTab === 'unread' ? t('empty.descUnread') : t('empty.descAll')}
            illustration="/illustrations/empty-notifications.svg"
            className="py-16"
          />
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              variant={n.read ? 'default' : 'elevated'}
              padding="md"
              onClick={() => markAsRead(n.id)}
              className={cn(
                'transition-all group cursor-pointer card-lift',
                n.read && 'opacity-75',
              )}
            >
              <div className="flex items-start gap-3.5">
                <IconBox tone={n.read ? 'neutral' : (n.category === 'learning' ? 'brand' : n.category === 'ai' ? 'ai' : 'info')} size="md" className="mt-0.5 flex-shrink-0">
                  {categoryIcons[n.category as keyof typeof categoryIcons]}
                </IconBox>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn('font-medium', n.read ? 'text-text-secondary' : 'text-text-primary')}>{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand inline-block shrink-0"></span>}
                  </div>
                  <p className={cn('text-sm mt-0.5 leading-relaxed', n.read ? 'text-text-tertiary' : 'text-text-secondary')}>{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-caption text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {n.time}
                    </span>
                    <Badge variant={n.category === 'ai' ? 'ai' : n.category === 'assessment' ? 'warning' : 'outline'} size="xs">
                      {t(`categories.${n.category}`)}
                    </Badge>
                  </div>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => markAsRead(n.id)}>
                    <CheckCheck className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
