import apiClient from './client';

export interface Activity {
  id: string;
  boardId: string;
  cardId: string | null;
  userId: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
  card: { id: string; title: string; cardNumber: number } | null;
}

export const activitiesApi = {
  list: (boardId: string, limit?: number) =>
    apiClient.get<Activity[]>(`/boards/${boardId}/activities`, { params: { limit } }).then((r) => r.data),
};
