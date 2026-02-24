import apiClient from './client';

export interface BoardTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export const templatesApi = {
  list: () =>
    apiClient.get<BoardTemplate[]>('/templates').then((r) => r.data),

  createFromBoard: (boardId: string, data: { name: string; description?: string }) =>
    apiClient.post<BoardTemplate>(`/boards/${boardId}/templates`, data).then((r) => r.data),

  apply: (workspaceId: string, templateId: string, data: { title: string }) =>
    apiClient
      .post(`/workspaces/${workspaceId}/boards/from-template/${templateId}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/templates/${id}`).then((r) => r.data),
};
