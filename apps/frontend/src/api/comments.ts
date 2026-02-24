import apiClient from './client';

export const commentsApi = {
  update: (id: string, content: string) =>
    apiClient.patch(`/comments/${id}`, { content }).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/comments/${id}`).then((r) => r.data),
};
