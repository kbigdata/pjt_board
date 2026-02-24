import apiClient from './client';

export interface Attachment {
  id: string;
  cardId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string; avatarUrl: string | null };
}

export const attachmentsApi = {
  list: (cardId: string) =>
    apiClient.get<Attachment[]>(`/cards/${cardId}/attachments`).then((r) => r.data),

  upload: (cardId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<Attachment>(`/cards/${cardId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  delete: (id: string) => apiClient.delete(`/attachments/${id}`).then((r) => r.data),

  getDownloadUrl: (id: string) =>
    apiClient
      .get<{ url: string; fileName: string; mimeType: string }>(`/attachments/${id}/download`)
      .then((r) => r.data),
};
