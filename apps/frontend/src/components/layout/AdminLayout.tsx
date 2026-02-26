import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useProfile } from '@/hooks/useAuth';

const navItems = [
  { path: '/admin', labelKey: 'layout.navDashboard', icon: '📊' },
  { path: '/admin/users', labelKey: 'layout.navUsers', icon: '👤' },
  { path: '/admin/workspaces', labelKey: 'layout.navWorkspaces', icon: '🏢' },
  { path: '/admin/settings', labelKey: 'layout.navSettings', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, isAuthenticated } = useAuthStore();
  const { isLoading } = useProfile();
  const location = useLocation();
  const { t } = useTranslation('admin');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">{t('layout.adminPanel')}</h1>
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-200">
            {t('layout.backToKanFlow')}
          </Link>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-1 ${
                (item.path === '/admin' && location.pathname === '/admin') ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path))
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
          {t('layout.loggedInAs', { name: user?.name })}
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
