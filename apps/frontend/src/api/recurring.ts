import apiClient from './client';

export interface RecurringConfig {
  id: string;
  cardId: string;
  cronExpression: string;
  nextRunAt: string;
  enabled: boolean;
}

export const recurringApi = {
  get: (cardId: string): Promise<RecurringConfig | null> =>
    apiClient
      .get<RecurringConfig>(`/cards/${cardId}/recurring`)
      .then((r) => r.data)
      .catch(() => null),

  create: (cardId: string, data: { cronExpression: string; nextRunAt?: string }) =>
    apiClient
      .post<RecurringConfig>(`/cards/${cardId}/recurring`, data)
      .then((r) => r.data),

  update: (cardId: string, data: { cronExpression?: string; nextRunAt?: string; enabled?: boolean }) =>
    apiClient
      .patch<RecurringConfig>(`/cards/${cardId}/recurring`, data)
      .then((r) => r.data),

  delete: (cardId: string) =>
    apiClient.delete(`/cards/${cardId}/recurring`).then((r) => r.data),

  toggle: (cardId: string) =>
    apiClient.post(`/cards/${cardId}/recurring/toggle`).then((r) => r.data),
};
