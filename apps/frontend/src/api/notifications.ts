import apiClient from './client';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (params?: { limit?: number; cursor?: string; unreadOnly?: boolean }) =>
    apiClient
      .get<Notification[]>('/notifications', { params })
      .then((r) => r.data),

  unreadCount: () =>
    apiClient
      .get<{ count: number }>('/notifications/unread-count')
      .then((r) => r.data),

  markAsRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    apiClient.post('/notifications/read-all').then((r) => r.data),
};
