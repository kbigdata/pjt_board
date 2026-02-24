import apiClient from './client';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  memberCount?: number;
  myRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface WorkspaceDetail extends Workspace {
  members: WorkspaceMember[];
}

export const workspacesApi = {
  list: () =>
    apiClient.get<Workspace[]>('/workspaces').then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<WorkspaceDetail>(`/workspaces/${id}`).then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<Workspace>('/workspaces', data).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch<Workspace>(`/workspaces/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/workspaces/${id}`).then((r) => r.data),
};
