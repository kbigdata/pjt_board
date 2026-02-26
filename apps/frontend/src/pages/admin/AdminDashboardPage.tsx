import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

export default function AdminDashboardPage() {
  const { t } = useTranslation('admin');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  if (isLoading) {
    return <div className="text-[var(--text-tertiary)]">{t('dashboard.loading')}</div>;
  }

  const statCards = [
    { label: t('dashboard.totalUsers'), value: stats?.totalUsers ?? 0 },
    { label: t('dashboard.activeUsers'), value: stats?.activeUsers ?? 0 },
    { label: t('dashboard.workspaces'), value: stats?.totalWorkspaces ?? 0 },
    { label: t('dashboard.activeBoards'), value: stats?.activeBoards ?? 0 },
    { label: t('dashboard.cards'), value: stats?.totalCards ?? 0 },
    { label: t('dashboard.activeSprints'), value: stats?.activeSprints ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">{t('dashboard.title')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-primary)] rounded-lg shadow p-4">
            <div className="text-sm text-[var(--text-tertiary)]">{stat.label}</div>
            <div className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Workspaces + Recent Boards (2-column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Workspaces */}
        <div className="bg-[var(--bg-primary)] rounded-lg shadow">
          <div className="px-4 py-3 border-b border-[var(--border-secondary)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('dashboard.recentWorkspaces')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="px-4 py-2 text-left text-[var(--text-tertiary)] font-medium">{t('dashboard.workspaceName')}</th>
                  <th className="px-4 py-2 text-left text-[var(--text-tertiary)] font-medium">{t('dashboard.owner')}</th>
                  <th className="px-4 py-2 text-right text-[var(--text-tertiary)] font-medium">{t('dashboard.memberCount')}</th>
                  <th className="px-4 py-2 text-right text-[var(--text-tertiary)] font-medium">{t('dashboard.boardCount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {stats?.recentWorkspaces?.map((ws) => (
                  <tr key={ws.id}>
                    <td className="px-4 py-2 text-[var(--text-primary)] font-medium">{ws.name}</td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">{ws.ownerName}</td>
                    <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{ws.memberCount}</td>
                    <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{ws.boardCount}</td>
                  </tr>
                ))}
                {(!stats?.recentWorkspaces || stats.recentWorkspaces.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-[var(--text-tertiary)]">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Boards */}
        <div className="bg-[var(--bg-primary)] rounded-lg shadow">
          <div className="px-4 py-3 border-b border-[var(--border-secondary)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('dashboard.recentBoards')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="px-4 py-2 text-left text-[var(--text-tertiary)] font-medium">{t('dashboard.boardTitle')}</th>
                  <th className="px-4 py-2 text-left text-[var(--text-tertiary)] font-medium">{t('dashboard.workspaceName')}</th>
                  <th className="px-4 py-2 text-right text-[var(--text-tertiary)] font-medium">{t('dashboard.cardCount')}</th>
                  <th className="px-4 py-2 text-right text-[var(--text-tertiary)] font-medium">{t('dashboard.createdDate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {stats?.recentBoards?.map((board) => (
                  <tr key={board.id}>
                    <td className="px-4 py-2 text-[var(--text-primary)] font-medium">{board.title}</td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">{board.workspaceName}</td>
                    <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{board.cardCount}</td>
                    <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                      {new Date(board.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!stats?.recentBoards || stats.recentBoards.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-[var(--text-tertiary)]">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-[var(--bg-primary)] rounded-lg shadow">
        <div className="px-4 py-3 border-b border-[var(--border-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('dashboard.recentUsers')}</h2>
        </div>
        <div className="divide-y divide-[var(--border-primary)]">
          {stats?.recentUsers.map((user) => (
            <div key={user.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-[var(--text-primary)]">{user.name}</div>
                <div className="text-sm text-[var(--text-tertiary)]">{user.email}</div>
              </div>
              <div className="text-sm text-[var(--text-tertiary)]">
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
