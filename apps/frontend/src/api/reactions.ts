import apiClient from './client';

export interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  emoji: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

export const EMOJI_MAP: Record<string, string> = {
  thumbsup: '👍',
  heart: '❤️',
  laugh: '😄',
  tada: '🎉',
  wow: '😮',
  sad: '😢',
};

export const EMOJI_KEYS = Object.keys(EMOJI_MAP) as Array<keyof typeof EMOJI_MAP>;

export const reactionsApi = {
  getReactions: (commentId: string) =>
    apiClient.get<CommentReaction[]>(`/comments/${commentId}/reactions`).then((r) => r.data),

  addReaction: (commentId: string, emoji: string) =>
    apiClient.post(`/comments/${commentId}/reactions`, { emoji }).then((r) => r.data),

  removeReaction: (commentId: string, emoji: string) =>
    apiClient.delete(`/comments/${commentId}/reactions/${emoji}`).then((r) => r.data),
};
