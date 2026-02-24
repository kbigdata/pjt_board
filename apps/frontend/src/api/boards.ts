import apiClient from './client';

export interface Board {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  visibility: string;
  position: number;
  createdById: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; avatarUrl: string | null };
  _count?: { members: number; cards: number };
}

export interface BoardDetail extends Board {
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }>;
  columns: Column[];
  _count: { members: number; cards: number };
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  columnType: string;
  position: number;
  wipLimit: number | null;
  color: string | null;
  archivedAt: string | null;
}

export interface Card {
  id: string;
  boardId: string;
  columnId: string;
  swimlaneId: string | null;
  cardNumber: number;
  title: string;
  description: string | null;
  priority: string;
  position: number;
  startDate: string | null;
  dueDate: string | null;
  createdById: string;
  archivedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  column?: { id: string; title: string };
  assignees?: Array<{ user: { id: string; name: string; avatarUrl: string | null } }>;
  labels?: Array<{ label: { id: string; name: string; color: string } }>;
  _count?: { comments: number; checklists: number; attachments: number };
}

export const boardsApi = {
  list: (workspaceId: string) =>
    apiClient.get<Board[]>(`/workspaces/${workspaceId}/boards`).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<BoardDetail>(`/boards/${id}`).then((r) => r.data),

  create: (workspaceId: string, data: { title: string; description?: string }) =>
    apiClient.post<Board>(`/workspaces/${workspaceId}/boards`, data).then((r) => r.data),

  update: (id: string, data: { title?: string; description?: string; visibility?: string }) =>
    apiClient.patch<Board>(`/boards/${id}`, data).then((r) => r.data),

  archive: (id: string) =>
    apiClient.post(`/boards/${id}/archive`).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/boards/${id}`).then((r) => r.data),

  getCards: (boardId: string) =>
    apiClient.get<Card[]>(`/boards/${boardId}/cards`).then((r) => r.data),

  getColumns: (boardId: string) =>
    apiClient.get<Column[]>(`/boards/${boardId}/columns`).then((r) => r.data),

  createColumn: (boardId: string, data: { title: string; columnType?: string }) =>
    apiClient.post<Column>(`/boards/${boardId}/columns`, data).then((r) => r.data),

  createCard: (boardId: string, data: { title: string; columnId: string; priority?: string }) =>
    apiClient.post<Card>(`/boards/${boardId}/cards`, data).then((r) => r.data),

  moveCard: (cardId: string, data: { columnId: string; position: number; swimlaneId?: string | null }) =>
    apiClient.patch(`/cards/${cardId}/move`, data).then((r) => r.data),

  updateCard: (cardId: string, data: Partial<{ title: string; description: string; priority: string }>) =>
    apiClient.patch(`/cards/${cardId}`, data).then((r) => r.data),

  archiveCard: (cardId: string) =>
    apiClient.post(`/cards/${cardId}/archive`).then((r) => r.data),

  moveColumn: (columnId: string, data: { position: number }) =>
    apiClient.patch(`/columns/${columnId}/move`, data).then((r) => r.data),

  getArchivedCards: (boardId: string) =>
    apiClient.get<Card[]>(`/boards/${boardId}/cards/archived`).then((r) => r.data),

  restoreCard: (cardId: string) =>
    apiClient.post<Card>(`/cards/${cardId}/restore`).then((r) => r.data),

  deleteColumn: (columnId: string, targetColumnId?: string) =>
    apiClient.delete(`/columns/${columnId}`, { params: targetColumnId ? { targetColumnId } : undefined }).then((r) => r.data),

  listArchived: (workspaceId: string) =>
    apiClient.get<Board[]>(`/workspaces/${workspaceId}/boards/archived`).then((r) => r.data),

  restore: (id: string) =>
    apiClient.post(`/boards/${id}/restore`).then((r) => r.data),

  permanentDelete: (id: string) =>
    apiClient.delete(`/boards/${id}/permanent`).then((r) => r.data),

  copyCard: (cardId: string, targetColumnId?: string) =>
    apiClient
      .post<Card>(`/cards/${cardId}/copy`, { targetColumnId })
      .then((r) => r.data),

  deleteCard: (cardId: string) =>
    apiClient.delete(`/cards/${cardId}`).then((r) => r.data),

  // CL-006, CL-009, CL-010: Column settings
  updateColumn: (
    columnId: string,
    data: { title?: string; color?: string | null; wipLimit?: number | null; description?: string | null },
  ) => apiClient.patch<Column>(`/columns/${columnId}`, data).then((r) => r.data),

  // LB-005, LB-006: Label management
  getBoardLabels: (boardId: string) =>
    apiClient.get<Array<{ id: string; name: string; color: string }>>(`/boards/${boardId}/labels`).then((r) => r.data),

  createLabel: (boardId: string, data: { name: string; color: string }) =>
    apiClient.post<{ id: string; name: string; color: string }>(`/boards/${boardId}/labels`, data).then((r) => r.data),

  updateLabel: (labelId: string, data: { name?: string; color?: string }) =>
    apiClient.patch<{ id: string; name: string; color: string }>(`/labels/${labelId}`, data).then((r) => r.data),

  addLabelToCard: (cardId: string, labelId: string) =>
    apiClient.post(`/cards/${cardId}/labels/${labelId}`).then((r) => r.data),

  removeLabelFromCard: (cardId: string, labelId: string) =>
    apiClient.delete(`/cards/${cardId}/labels/${labelId}`).then((r) => r.data),

  // BD-005, BD-006: Board favorites
  toggleFavorite: (boardId: string) =>
    apiClient.post(`/boards/${boardId}/favorite`).then((r) => r.data),

  getFavorites: () =>
    apiClient.get<Board[]>('/boards/favorites').then((r) => r.data),

  // IO-001: Export board as JSON
  exportBoard: (boardId: string) =>
    apiClient.get(`/boards/${boardId}/export`).then((r) => r.data),

  // IO-002: Import board from JSON
  importBoard: (workspaceId: string, data: unknown) =>
    apiClient.post(`/workspaces/${workspaceId}/boards/import`, data).then((r) => r.data),
};
