import apiClient from './client';

export interface CFDDataPoint {
  date: string;
  columns: Array<{ columnId: string; columnTitle: string; count: number }>;
}

export interface LeadTimeEntry {
  cardId: string;
  cardTitle: string;
  leadTimeHours: number;
}

export interface ThroughputEntry {
  date: string;
  count: number;
}

export const reportsApi = {
  getCFD: (boardId: string, from: string, to: string) =>
    apiClient
      .get<CFDDataPoint[]>(`/boards/${boardId}/reports/cfd`, { params: { from, to } })
      .then((r) => r.data),

  getLeadTime: (boardId: string, from: string, to: string) =>
    apiClient
      .get<LeadTimeEntry[]>(`/boards/${boardId}/reports/lead-time`, { params: { from, to } })
      .then((r) => r.data),

  getThroughput: (boardId: string, from: string, to: string) =>
    apiClient
      .get<ThroughputEntry[]>(`/boards/${boardId}/reports/throughput`, { params: { from, to } })
      .then((r) => r.data),

  takeSnapshot: (boardId: string) =>
    apiClient.post(`/boards/${boardId}/reports/snapshot`).then((r) => r.data),
};
