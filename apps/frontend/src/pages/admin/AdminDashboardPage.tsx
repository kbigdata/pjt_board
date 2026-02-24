import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
  });

  if (isLoading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats?.totalUsers ?? 0 },
          { label: 'Active Users', value: stats?.activeUsers ?? 0 },
          { label: 'Workspaces', value: stats?.totalWorkspaces ?? 0 },
          { label: 'Boards', value: stats?.totalBoards ?? 0 },
          { label: 'Cards', value: stats?.totalCards ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="text-2xl font-bold mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Recent Users</h2>
        </div>
        <div className="divide-y">
          {stats?.recentUsers.map((user) => (
            <div key={user.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
              <div className="text-sm text-gray-400">
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
