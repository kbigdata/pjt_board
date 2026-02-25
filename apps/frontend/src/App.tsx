import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import AuthLayout from '@/components/layout/AuthLayout';
import AppLayout from '@/components/layout/AppLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import WorkspacesPage from '@/pages/WorkspacesPage';
import WorkspaceDetailPage from '@/pages/WorkspaceDetailPage';
import BoardPage from '@/pages/BoardPage';
import AutomationPage from '@/pages/AutomationPage';
import ReportPage from '@/pages/ReportPage';
import DashboardPage from '@/pages/DashboardPage';
import WorkspaceSettingsPage from '@/pages/WorkspaceSettingsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminWorkspacesPage from '@/pages/admin/AdminWorkspacesPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/workspaces" element={<AdminWorkspacesPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/" element={<WorkspacesPage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
        <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/boards/:boardId/automations" element={<AutomationPage />} />
        <Route path="/boards/:boardId/reports" element={<ReportPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
