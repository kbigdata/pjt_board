import apiClient from './client';

export interface Swimlane {
  id: string;
  boardId: string;
  title: string;
  position: number;
  color: string | null;
  isDefault: boolean;
  archivedAt: string | null;
}

export const swimlanesApi = {
  list: (boardId: string) =>
    apiClient.get<Swimlane[]>(`/boards/${boardId}/swimlanes`).then((r) => r.data),

  create: (boardId: string, data: { title: string; color?: string }) =>
    apiClient.post<Swimlane>(`/boards/${boardId}/swimlanes`, data).then((r) => r.data),

  update: (id: string, data: { title?: string; color?: string }) =>
    apiClient.patch<Swimlane>(`/swimlanes/${id}`, data).then((r) => r.data),

  move: (id: string, data: { position: number }) =>
    apiClient.patch<Swimlane>(`/swimlanes/${id}/move`, data).then((r) => r.data),

  archive: (id: string) => apiClient.post(`/swimlanes/${id}/archive`).then((r) => r.data),

  restore: (id: string) => apiClient.post(`/swimlanes/${id}/restore`).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/swimlanes/${id}`).then((r) => r.data),
};
