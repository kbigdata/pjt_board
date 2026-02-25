import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import type { Notification } from '@/api/notifications';
import NotificationSettings from '@/components/NotificationSettings';

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

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadCount();
  const { data: notifications, isLoading } = useNotifications(isOpen);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  }

  function handleMarkAllRead() {
    markAllAsRead.mutate();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="dropdown-menu absolute right-0 mt-1 w-80 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markAllAsRead.isPending}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSettingsOpen(true);
                }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-0.5 rounded"
                title="Notification settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-[var(--text-tertiary)] text-center">Loading...</div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[var(--text-tertiary)] text-center">
                No notifications yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-primary)]">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {settingsOpen && (
        <NotificationSettings onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (notification: Notification) => void;
}) {
  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors flex items-start gap-3 ${
        !notification.isRead ? 'bg-[var(--accent-light)]' : ''
      }`}
    >
      <div className="flex-shrink-0 mt-1">
        {!notification.isRead ? (
          <span className="block w-2 h-2 rounded-full bg-[var(--accent)]" />
        ) : (
          <span className="block w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{notification.title}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
    </button>
  );
}
