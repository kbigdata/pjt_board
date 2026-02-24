import apiClient from './client';

export interface CardTag {
  id: string;
  cardId: string;
  tag: string;
}

export const cardTagsApi = {
  list: (cardId: string) =>
    apiClient.get<CardTag[]>(`/cards/${cardId}/tags`).then((r) => r.data),

  add: (cardId: string, tag: string) =>
    apiClient.post<CardTag>(`/cards/${cardId}/tags`, { tag }).then((r) => r.data),

  remove: (cardId: string, tag: string) =>
    apiClient
      .delete(`/cards/${cardId}/tags/${encodeURIComponent(tag)}`)
      .then((r) => r.data),
};
