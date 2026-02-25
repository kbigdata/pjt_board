import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useProfile } from '@/hooks/useAuth';
import { useUserSocket } from '@/hooks/useSocket';
import AppShell from './AppShell';

export default function AppLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const { isLoading } = useProfile();
  useUserSocket(user?.id);

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

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
