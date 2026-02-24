import apiClient from './client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUser {
  workspaceMembers: {
    id: string;
    role: string;
    workspace: { id: string; name: string; slug: string };
  }[];
}

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner: { id: string; name: string; email: string } | null;
  memberCount: number;
  boardCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: {
    id: string;
    role: string;
    user: { id: string; name: string; email: string; avatarUrl: string | null };
  }[];
  boards: {
    id: string;
    title: string;
    visibility: string;
    createdAt: string;
    archivedAt: string | null;
  }[];
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  totalBoards: number;
  totalCards: number;
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
}

export interface SystemSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const adminApi = {
  getUsers: (params: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<AdminUser>>('/admin/users', { params }).then((r) => r.data),

  getUserDetail: (id: string) =>
    apiClient.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data),

  updateUser: (id: string, data: { isAdmin?: boolean; deactivated?: boolean }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data),

  resetPassword: (id: string) =>
    apiClient.post<{ temporaryPassword: string }>(`/admin/users/${id}/reset-password`).then((r) => r.data),

  getWorkspaces: (params: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<AdminWorkspace>>('/admin/workspaces', { params }).then((r) => r.data),

  getWorkspaceDetail: (id: string) =>
    apiClient.get<AdminWorkspaceDetail>(`/admin/workspaces/${id}`).then((r) => r.data),

  getStats: () =>
    apiClient.get<SystemStats>('/admin/stats').then((r) => r.data),

  getSettings: () =>
    apiClient.get<SystemSetting[]>('/admin/settings').then((r) => r.data),

  updateSettings: (data: { settings: { key: string; value: string }[] }) =>
    apiClient.patch<SystemSetting[]>('/admin/settings', data).then((r) => r.data),
};
