import { create } from 'zustand';

const STORAGE_KEY = 'kanflow:ui-state';

type NavView = 'home' | 'search' | 'activity' | 'bookmarks' | 'dashboard';
type Theme = 'light' | 'dark' | 'system';
type DetailView = 'card' | 'thread' | null;

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  detailPanelOpen: boolean;
  detailPanelWidth: number;
  detailPanelView: DetailView;
  activeCardId: string | null;
  activeThreadId: string | null;
  activeTab: string;
  activeNavView: NavView;
  theme: Theme;
}

interface UIStore extends UIState {
  toggleSidebar(): void;
  setSidebarWidth(w: number): void;
  setDetailPanelWidth(w: number): void;
  openCard(cardId: string): void;
  closeDetail(): void;
  openThread(commentId: string): void;
  backFromThread(): void;
  setActiveTab(tab: string): void;
  setNavView(view: NavView): void;
  setTheme(t: Theme): void;
}

interface PersistedState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  detailPanelWidth: number;
  theme: Theme;
}

function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const persisted = loadState();

export const useUIStore = create<UIStore>((set, get) => ({
  sidebarOpen: persisted.sidebarOpen ?? true,
  sidebarWidth: persisted.sidebarWidth ?? 240,
  detailPanelOpen: false,
  detailPanelWidth: persisted.detailPanelWidth ?? 420,
  detailPanelView: null,
  activeCardId: null,
  activeThreadId: null,
  activeTab: 'description',
  activeNavView: 'home',
  theme: persisted.theme ?? 'system',

  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarOpen;
      saveState({
        sidebarOpen: next,
        sidebarWidth: state.sidebarWidth,
        detailPanelWidth: state.detailPanelWidth,
        theme: state.theme,
      });
      return { sidebarOpen: next };
    }),

  setSidebarWidth: (w) =>
    set((state) => {
      saveState({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: w,
        detailPanelWidth: state.detailPanelWidth,
        theme: state.theme,
      });
      return { sidebarWidth: w };
    }),

  setDetailPanelWidth: (w) =>
    set((state) => {
      saveState({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        detailPanelWidth: w,
        theme: state.theme,
      });
      return { detailPanelWidth: w };
    }),

  openCard: (cardId) =>
    set({
      detailPanelOpen: true,
      activeCardId: cardId,
      detailPanelView: 'card',
      activeTab: 'description',
    }),

  closeDetail: () =>
    set({
      detailPanelOpen: false,
      activeCardId: null,
      detailPanelView: null,
    }),

  openThread: (commentId) =>
    set({
      detailPanelView: 'thread',
      activeThreadId: commentId,
    }),

  backFromThread: () =>
    set({
      detailPanelView: 'card',
      activeThreadId: null,
    }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setNavView: (view) => set({ activeNavView: view }),

  setTheme: (t) =>
    set((state) => {
      // Apply theme to DOM
      const resolved = t === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : t;
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.style.colorScheme = resolved;
      localStorage.setItem('kanflow-theme', t);

      saveState({
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        detailPanelWidth: state.detailPanelWidth,
        theme: t,
      });
      return { theme: t };
    }),
}));
