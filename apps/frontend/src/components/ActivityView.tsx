import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { useUIStore } from '@/stores/ui';
import type { Notification } from '@/api/notifications';

type FilterTab = 'all' | 'mentions' | 'due-soon' | 'assigned';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDateGroup(date: string): 'today' | 'yesterday' | 'this-week' | 'older' {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 7) return 'this-week';
  return 'older';
}

// Group labels are now resolved via i18n in the component

const FILTER_KEYWORDS: Record<FilterTab, string[]> = {
  all: [],
  mentions: ['mention', 'MENTION'],
  'due-soon': ['due', 'DUE', 'overdue', 'OVERDUE'],
  assigned: ['assigned', 'ASSIGNED'],
};

export default function ActivityView() {
  const navigate = useNavigate();
  const { openCard } = useUIStore();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const { t } = useTranslation('activity');
  const { t: tc } = useTranslation('common');

  const { data: notifications = [], isLoading } = useNotifications(true);
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count ?? 0;

  const filteredNotifications = notifications.filter((n: Notification) => {
    if (activeFilter === 'all') return true;
    const keywords = FILTER_KEYWORDS[activeFilter];
    return keywords.some((kw) => n.type.toLowerCase().includes(kw.toLowerCase()));
  });

  // Group by date
  const groups: Record<string, Notification[]> = {};
  for (const n of filteredNotifications) {
    const group = getDateGroup(n.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  }

  const groupOrder = ['today', 'yesterday', 'this-week', 'older'];

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      // Try to extract card ID from link like /boards/:boardId?card=:cardId
      const cardMatch = notification.link.match(/[?&]card=([^&]+)/);
      if (cardMatch) {
        openCard(cardMatch[1]);
      } else {
        navigate(notification.link);
      }
    }
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: t('all') },
    { id: 'mentions', label: t('mentions') },
    { id: 'due-soon', label: t('dueDate') },
    { id: 'assigned', label: t('assigned') },
  ];

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t('title')}</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">{unreadCount} {tc('unread')}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-[var(--border-primary)] mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeFilter === tab.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {isLoading ? (
        <div className="text-sm text-[var(--text-tertiary)] py-8 text-center">{tc('loading')}</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-sm text-[var(--text-tertiary)] py-8 text-center">{t('empty')}</div>
      ) : (
        <div className="space-y-6">
          {groupOrder
            .filter((g) => groups[g]?.length > 0)
            .map((group) => (
              <div key={group}>
                <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  {tc(`date.${group}`)}
                </h3>
                <div className="space-y-1">
                  {groups[group].map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-3 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-start gap-3 ${
                        !notification.isRead ? 'bg-[var(--accent-light)]' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1.5">
                        {!notification.isRead ? (
                          <span className="block w-2 h-2 rounded-full bg-[var(--accent)]" />
                        ) : (
                          <span className="block w-2 h-2 rounded-full bg-transparent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{notification.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">{timeAgo(notification.createdAt)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
