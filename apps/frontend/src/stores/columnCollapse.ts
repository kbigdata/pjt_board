import { create } from 'zustand';

interface ColumnCollapseState {
  collapsed: Record<string, boolean>;
  toggleColumn: (columnId: string) => void;
  isCollapsed: (columnId: string) => boolean;
}

const STORAGE_KEY = 'kanflow:collapsed-columns';

function loadCollapsed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsed(collapsed: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
}

export const useColumnCollapseStore = create<ColumnCollapseState>((set, get) => ({
  collapsed: loadCollapsed(),

  toggleColumn: (columnId: string) => {
    set((state) => {
      const next = { ...state.collapsed, [columnId]: !state.collapsed[columnId] };
      if (!next[columnId]) delete next[columnId];
      saveCollapsed(next);
      return { collapsed: next };
    });
  },

  isCollapsed: (columnId: string) => !!get().collapsed[columnId],
}));
