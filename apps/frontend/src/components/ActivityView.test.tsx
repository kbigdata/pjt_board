import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import ActivityView from './ActivityView';

const mockNavigate = vi.fn();
const mockOpenCard = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/stores/ui', () => ({
  useUIStore: () => ({ openCard: mockOpenCard }),
}));

const mockMarkAsRead = { mutate: vi.fn(), isPending: false };
const mockMarkAllAsRead = { mutate: vi.fn(), isPending: false };

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useUnreadCount: vi.fn(),
  useMarkAsRead: () => mockMarkAsRead,
  useMarkAllAsRead: () => mockMarkAllAsRead,
}));

import { useNotifications, useUnreadCount } from '@/hooks/useNotifications';
const mockedUseNotifications = vi.mocked(useNotifications);
const mockedUseUnreadCount = vi.mocked(useUnreadCount);

beforeEach(() => {
  vi.clearAllMocks();
});

function createNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    userId: 'u1',
    type: 'COMMENT',
    title: 'New comment',
    message: 'Someone commented on your card',
    link: null,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ActivityView', () => {
  it('should show loading state', () => {
    mockedUseNotifications.mockReturnValue({
      data: [],
      isLoading: true,
    } as ReturnType<typeof useNotifications>);
    mockedUseUnreadCount.mockReturnValue({
      data: { count: 0 },
    } as ReturnType<typeof useUnreadCount>);

    renderWithProviders(<ActivityView />);

    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('should show empty state', () => {
    mockedUseNotifications.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useNotifications>);
    mockedUseUnreadCount.mockReturnValue({
      data: { count: 0 },
    } as ReturnType<typeof useUnreadCount>);

    renderWithProviders(<ActivityView />);

    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('should render notifications grouped by date', () => {
    const todayNotif = createNotification({
      id: 'n1',
      title: 'Today notification',
      createdAt: new Date().toISOString(),
    });
    const yesterdayNotif = createNotification({
      id: 'n2',
      title: 'Yesterday notification',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    });

    mockedUseNotifications.mockReturnValue({
      data: [todayNotif, yesterdayNotif],
      isLoading: false,
    } as ReturnType<typeof useNotifications>);
    mockedUseUnreadCount.mockReturnValue({
      data: { count: 2 },
    } as ReturnType<typeof useUnreadCount>);

    renderWithProviders(<ActivityView />);

    expect(screen.getByText('Today notification')).toBeInTheDocument();
    expect(screen.getByText('Yesterday notification')).toBeInTheDocument();
    // Date group headers
    expect(screen.getByText('date.today')).toBeInTheDocument();
    expect(screen.getByText('date.yesterday')).toBeInTheDocument();
  });

  it('should filter by mentions tab', async () => {
    const commentNotif = createNotification({
      id: 'n1',
      type: 'COMMENT',
      title: 'Regular comment',
    });
    const mentionNotif = createNotification({
      id: 'n2',
      type: 'MENTION',
      title: 'You were mentioned',
    });

    mockedUseNotifications.mockReturnValue({
      data: [commentNotif, mentionNotif],
      isLoading: false,
    } as ReturnType<typeof useNotifications>);
    mockedUseUnreadCount.mockReturnValue({
      data: { count: 2 },
    } as ReturnType<typeof useUnreadCount>);

    renderWithProviders(<ActivityView />);

    // Both visible in "all" tab
    expect(screen.getByText('Regular comment')).toBeInTheDocument();
    expect(screen.getByText('You were mentioned')).toBeInTheDocument();

    // Click mentions tab
    screen.getByText('mentions').click();

    await waitFor(() => {
      expect(screen.queryByText('Regular comment')).not.toBeInTheDocument();
      expect(screen.getByText('You were mentioned')).toBeInTheDocument();
    });
  });

  it('should call markAllAsRead', () => {
    mockedUseNotifications.mockReturnValue({
      data: [createNotification()],
      isLoading: false,
    } as ReturnType<typeof useNotifications>);
    mockedUseUnreadCount.mockReturnValue({
      data: { count: 3 },
    } as ReturnType<typeof useUnreadCount>);

    renderWithProviders(<ActivityView />);

    screen.getByText('markAllRead').click();

    expect(mockMarkAllAsRead.mutate).toHaveBeenCalled();
  });

  it('should openCard when notification link has card param', () => {
    const notif = createNotification({
      link: '/boards/b1?card=c123',
      isRead: false,
    });

    mockedUseNotifications.mockReturnValue({
      data: [notif],
      isLoading: false,
    } as ReturnType<typeof useNotifications>);
    mockedUseUnreadCount.mockReturnValue({
      data: { count: 1 },
    } as ReturnType<typeof useUnreadCount>);

    renderWithProviders(<ActivityView />);

    screen.getByText('New comment').click();

    expect(mockMarkAsRead.mutate).toHaveBeenCalledWith('n1');
    expect(mockOpenCard).toHaveBeenCalledWith('c123');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should navigate when notification link has no card param', () => {
    const notif = createNotification({
      link: '/boards/b1',
      isRead: true,
    });

    mockedUseNotifications.mockReturnValue({
      data: [notif],
      isLoading: false,
    } as ReturnType<typeof useNotifications>);
    mockedUseUnreadCount.mockReturnValue({
      data: { count: 0 },
    } as ReturnType<typeof useUnreadCount>);

    renderWithProviders(<ActivityView />);

    screen.getByText('New comment').click();

    // Already read — should not mark as read
    expect(mockMarkAsRead.mutate).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/boards/b1');
    expect(mockOpenCard).not.toHaveBeenCalled();
  });
});
