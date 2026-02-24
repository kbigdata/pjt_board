import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">KanFlow</h1>
          <p className="mt-2 text-gray-600">Self-hosted Kanban Board</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
