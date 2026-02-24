import apiClient from './client';
import type { Card } from './boards';

export interface DashboardCard extends Omit<Card, 'column'> {
  board?: { title: string };
  column?: { id: string; title: string };
}

export const dashboardApi = {
  getMyCards: (boardIds: string[]) =>
    Promise.all(
      boardIds.map((id) => apiClient.get<Card[]>(`/boards/${id}/cards`).then((r) => r.data)),
    ).then((results) => results.flat() as DashboardCard[]),
};
