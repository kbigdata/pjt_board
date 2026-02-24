import apiClient from './client';

export interface AutomationCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AutomationAction {
  type: string;
  [key: string]: unknown;
}

export interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  trigger: { type: string; [key: string]: unknown };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const automationApi = {
  list: (boardId: string) =>
    apiClient.get<AutomationRule[]>(`/boards/${boardId}/automations`).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<AutomationRule>(`/automations/${id}`).then((r) => r.data),

  create: (boardId: string, data: Partial<AutomationRule>) =>
    apiClient.post<AutomationRule>(`/boards/${boardId}/automations`, data).then((r) => r.data),

  update: (id: string, data: Partial<AutomationRule>) =>
    apiClient.patch<AutomationRule>(`/automations/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/automations/${id}`).then((r) => r.data),

  toggle: (id: string) =>
    apiClient.post<AutomationRule>(`/automations/${id}/toggle`).then((r) => r.data),
};
