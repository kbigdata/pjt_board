import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">KanFlow</h1>
          <p className="mt-2 text-[var(--text-tertiary)]">Self-hosted Kanban Board</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
