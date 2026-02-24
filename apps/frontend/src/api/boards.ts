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

  moveCard: (cardId: string, data: { columnId: string; position: number; swimlaneId?: string }) =>
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
};
