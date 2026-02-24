import apiClient from './client';

export interface CardLink {
  id: string;
  sourceCardId: string;
  targetCardId: string;
  linkType: 'BLOCKS' | 'BLOCKED_BY' | 'RELATES_TO' | 'DUPLICATES';
  createdAt: string;
  sourceCard?: { id: string; title: string; cardNumber: number };
  targetCard?: { id: string; title: string; cardNumber: number };
}

export const cardLinksApi = {
  list: (cardId: string) =>
    apiClient.get<CardLink[]>(`/cards/${cardId}/links`).then((r) => r.data),

  create: (cardId: string, data: { targetCardId: string; linkType: string }) =>
    apiClient.post<CardLink>(`/cards/${cardId}/links`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/card-links/${id}`).then((r) => r.data),
};
