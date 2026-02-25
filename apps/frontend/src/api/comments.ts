import apiClient from './client';

export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  content: string;
  parentCommentId: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
  _count?: { replies: number };
  replies?: Array<{ author: { id: string; name: string; avatarUrl: string | null } }>;
  reactions?: Array<{ id: string; emoji: string; userId: string; user: { id: string; name: string } }>;
}

export const commentsApi = {
  getByCardId: (cardId: string) =>
    apiClient.get<Comment[]>(`/cards/${cardId}/comments`).then((r) => r.data),

  create: (cardId: string, content: string) =>
    apiClient.post<Comment>(`/cards/${cardId}/comments`, { content }).then((r) => r.data),

  update: (id: string, content: string) =>
    apiClient.patch<Comment>(`/comments/${id}`, { content }).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/comments/${id}`).then((r) => r.data),

  getReplies: (commentId: string) =>
    apiClient.get<Comment[]>(`/comments/${commentId}/replies`).then((r) => r.data),

  createReply: (commentId: string, content: string) =>
    apiClient.post<Comment>(`/comments/${commentId}/replies`, { content }).then((r) => r.data),

  togglePin: (commentId: string) =>
    apiClient.patch<Comment>(`/comments/${commentId}/pin`).then((r) => r.data),
};
