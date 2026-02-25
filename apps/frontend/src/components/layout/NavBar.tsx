import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Bell, Star, BarChart2, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useLogout } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badgeCount?: number;
  onClick: () => void;
}

function NavItem({ icon, label, isActive, badgeCount, onClick }: NavItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 200);
  };

  const handleMouseLeave = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={onClick}
        className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-[#ababad] hover:bg-white/10 hover:text-white'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full -ml-[3px]" />
        )}
        {icon}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>
      {showTooltip && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}

export default function NavBar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: unreadData } = useUnreadCount();
  const logoutMutation = useLogout();
  const { activeNavView, setNavView } = useUIStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('nav');

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <div className="w-14 bg-[var(--nav-bg,#1a1d21)] flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {/* Top nav items */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <NavItem
          icon={<Home size={18} />}
          label={t('home')}
          isActive={activeNavView === 'home'}
          onClick={() => setNavView('home')}
        />
        <NavItem
          icon={<Search size={18} />}
          label={t('search')}
          isActive={activeNavView === 'search'}
          onClick={() => setNavView('search')}
        />
        <NavItem
          icon={<Bell size={18} />}
          label={t('activity')}
          isActive={activeNavView === 'activity'}
          badgeCount={unreadCount}
          onClick={() => setNavView('activity')}
        />
        <NavItem
          icon={<Star size={18} />}
          label={t('bookmarks')}
          isActive={activeNavView === 'bookmarks'}
          onClick={() => setNavView('bookmarks')}
        />
        <NavItem
          icon={<BarChart2 size={18} />}
          label={t('dashboard')}
          isActive={false}
          onClick={() => navigate('/dashboard')}
        />
      </div>

      {/* Bottom: user avatar */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu((prev) => !prev)}
          className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
          title={user?.name ?? 'User'}
        >
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </button>
        {showUserMenu && (
          <div className="dropdown-menu absolute bottom-full left-full mb-1 ml-2 py-1 min-w-[180px] z-50">
            <div className="px-3 py-2 border-b border-[var(--border-primary)]">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</p>
            </div>
            <div className="px-3 py-2 border-b border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-1.5">{t('theme.title')}</p>
              <ThemeToggle />
            </div>
            <div className="px-3 py-2 border-b border-[var(--border-primary)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-1.5">{t('language.title')}</p>
              <LanguageSwitcher />
            </div>
            <button
              onClick={() => {
                setShowUserMenu(false);
                logoutMutation.mutate();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <LogOut size={14} />
              {t('logout')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
