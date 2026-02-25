import apiClient from './client';

export interface UserSearchResult {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export const usersApi = {
  search: (q: string) =>
    apiClient.get<UserSearchResult[]>('/users/search', { params: { q } }).then((r) => r.data),
};
