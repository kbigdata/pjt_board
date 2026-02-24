import apiClient from './client';

export interface SavedFilter {
  id: string;
  boardId: string;
  name: string;
  filters: {
    priority?: string[];
    assigneeIds?: string[];
    labelIds?: string[];
    keyword?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
  };
}

export const savedFiltersApi = {
  list: (boardId: string) =>
    apiClient.get<SavedFilter[]>(`/boards/${boardId}/saved-filters`).then((r) => r.data),

  create: (boardId: string, data: { name: string; filters: object }) =>
    apiClient.post<SavedFilter>(`/boards/${boardId}/saved-filters`, data).then((r) => r.data),

  update: (id: string, data: { name?: string; filters?: object }) =>
    apiClient.patch<SavedFilter>(`/saved-filters/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/saved-filters/${id}`).then((r) => r.data),
};
