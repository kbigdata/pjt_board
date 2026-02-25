import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';

type ThemeMode = 'light' | 'dark' | 'system';

const options: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'light', icon: <Sun size={14} />, label: 'Light' },
  { mode: 'dark', icon: <Moon size={14} />, label: 'Dark' },
  { mode: 'system', icon: <Monitor size={14} />, label: 'System' },
];

export default function ThemeToggle() {
  const { themeMode, setThemeMode } = useThemeStore();

  return (
    <div className="flex items-center gap-1">
      {options.map(({ mode, icon, label }) => (
        <button
          key={mode}
          onClick={() => setThemeMode(mode)}
          title={label}
          className={`flex items-center justify-center w-7 h-7 rounded-md text-xs transition-colors ${
            themeMode === mode
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
