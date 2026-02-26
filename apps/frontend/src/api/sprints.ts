import apiClient from './client';

export interface Sprint {
  id: string;
  boardId: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { cards: number };
}

export interface SprintProgress {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  percentComplete: number;
}

export const sprintsApi = {
  list: (boardId: string) =>
    apiClient.get<Sprint[]>(`/boards/${boardId}/sprints`).then((r) => r.data),

  getActive: (boardId: string) =>
    apiClient.get<Sprint | null>(`/boards/${boardId}/sprints/active`).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Sprint>(`/sprints/${id}`).then((r) => r.data),

  create: (boardId: string, data: { name: string; goal?: string; startDate: string; endDate: string }) =>
    apiClient.post<Sprint>(`/boards/${boardId}/sprints`, data).then((r) => r.data),

  update: (id: string, data: { name?: string; goal?: string; startDate?: string; endDate?: string }) =>
    apiClient.patch<Sprint>(`/sprints/${id}`, data).then((r) => r.data),

  start: (id: string) =>
    apiClient.post<Sprint>(`/sprints/${id}/start`).then((r) => r.data),

  complete: (id: string) =>
    apiClient.post<Sprint>(`/sprints/${id}/complete`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.post<Sprint>(`/sprints/${id}/cancel`).then((r) => r.data),

  addCards: (id: string, cardIds: string[]) =>
    apiClient.post(`/sprints/${id}/cards`, { cardIds }).then((r) => r.data),

  removeCards: (id: string, cardIds: string[]) =>
    apiClient.delete(`/sprints/${id}/cards`, { data: { cardIds } }).then((r) => r.data),

  getProgress: (id: string) =>
    apiClient.get<SprintProgress>(`/sprints/${id}/progress`).then((r) => r.data),
};
