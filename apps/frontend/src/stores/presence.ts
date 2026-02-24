import { create } from 'zustand';

interface PresenceState {
  onlineUsers: Record<string, string[]>; // boardId -> userId[]
  cardEditors: Record<string, string>; // cardId -> userId
  setOnlineUsers: (boardId: string, userIds: string[]) => void;
  setCardEditor: (cardId: string, userId: string | null) => void;
  clearBoard: (boardId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: {},
  cardEditors: {},

  setOnlineUsers: (boardId, userIds) =>
    set((state) => ({
      onlineUsers: { ...state.onlineUsers, [boardId]: userIds },
    })),

  setCardEditor: (cardId, userId) =>
    set((state) => {
      const next = { ...state.cardEditors };
      if (userId === null) {
        delete next[cardId];
      } else {
        next[cardId] = userId;
      }
      return { cardEditors: next };
    }),

  clearBoard: (boardId) =>
    set((state) => {
      const next = { ...state.onlineUsers };
      delete next[boardId];
      return { onlineUsers: next };
    }),
}));
