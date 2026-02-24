import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useProfile, useLogout } from '@/hooks/useAuth';
import { useUserSocket } from '@/hooks/useSocket';
import NotificationBell from '@/components/NotificationBell';

export default function AppLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const { isLoading } = useProfile();
  const logoutMutation = useLogout();
  const location = useLocation();

  // Join user room for real-time notifications
  useUserSocket(user?.id);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-gray-900">
              KanFlow
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className={`text-sm font-medium ${
                  location.pathname === '/'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Workspaces
              </Link>
              <Link
                to="/dashboard"
                className={`text-sm font-medium ${
                  location.pathname === '/dashboard'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={() => logoutMutation.mutate()}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
