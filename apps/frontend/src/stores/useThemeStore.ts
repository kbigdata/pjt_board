import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  accentColor: string;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
}

const STORAGE_KEY = 'kanflow-theme';

function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = resolved;
}

const savedMode = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? 'system';
const initialResolved = getResolvedTheme(savedMode);
applyTheme(initialResolved);

export const useThemeStore = create<ThemeStore>((set, get) => {
  // Listen for OS theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    const { themeMode } = get();
    if (themeMode === 'system') {
      const resolved = e.matches ? 'dark' : 'light';
      applyTheme(resolved);
      set({ resolvedTheme: resolved });
    }
  });

  return {
    themeMode: savedMode,
    resolvedTheme: initialResolved,
    accentColor: '#2563EB',

    setThemeMode: (mode) => {
      localStorage.setItem(STORAGE_KEY, mode);
      const resolved = getResolvedTheme(mode);
      applyTheme(resolved);
      set({ themeMode: mode, resolvedTheme: resolved });
    },

    setAccentColor: (color) => {
      document.documentElement.style.setProperty('--accent', color);
      document.documentElement.style.setProperty('--accent-color', color);
      set({ accentColor: color });
    },
  };
});
