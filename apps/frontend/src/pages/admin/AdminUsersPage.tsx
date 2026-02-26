import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

export default function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tempPassword, setTempPassword] = useState<{ userId: string; password: string } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: search || undefined }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isAdmin?: boolean; deactivated?: boolean } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => adminApi.resetPassword(id),
    onSuccess: (data, userId) => {
      setTempPassword({ userId, password: data.temporaryPassword });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">{t('users.title')}</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          className="border border-[var(--border-secondary)] rounded-md px-3 py-2 text-sm flex-1 max-w-md bg-[var(--bg-primary)] text-[var(--text-primary)]"
        />
        <button
          type="submit"
          className="bg-[var(--accent)] text-white px-4 py-2 rounded-md text-sm hover:opacity-90"
        >
          {t('users.search')}
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            {t('users.clear')}
          </button>
        )}
      </form>

      {/* Temp password modal */}
      {tempPassword && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="font-medium text-yellow-800">{t('users.tempPasswordGenerated')}</div>
          <div className="mt-1 font-mono text-sm bg-white px-2 py-1 rounded border inline-block">
            {tempPassword.password}
          </div>
          <button
            onClick={() => setTempPassword(null)}
            className="ml-4 text-sm text-yellow-600 hover:text-yellow-800"
          >
            {t('users.dismiss')}
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-[var(--text-tertiary)]">{t('users.loading')}</div>
      ) : (
        <>
          <div className="bg-[var(--bg-primary)] rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-secondary)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('users.name')}</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('users.email')}</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('users.joined')}</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('users.status')}</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('users.admin')}</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {data?.data.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{user.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{user.email}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.deactivatedAt
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.deactivatedAt ? t('users.deactivated') : t('users.active')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          updateUserMutation.mutate({
                            id: user.id,
                            data: { isAdmin: !user.isAdmin },
                          })
                        }
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          user.isAdmin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.isAdmin ? t('users.adminRole') : t('users.userRole')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateUserMutation.mutate({
                              id: user.id,
                              data: { deactivated: !user.deactivatedAt },
                            })
                          }
                          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                          {user.deactivatedAt ? t('users.activate') : t('users.deactivate')}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(t('users.confirmResetPW'))) {
                              resetPasswordMutation.mutate(user.id);
                            }
                          }}
                          className="text-xs text-orange-500 hover:text-orange-700"
                        >
                          {t('users.resetPW')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-[var(--text-tertiary)]">
                {t('users.page', {
                  current: data.meta.page,
                  total: data.meta.totalPages,
                  count: data.meta.total,
                })}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 border border-[var(--border-secondary)] rounded text-sm disabled:opacity-50 text-[var(--text-primary)]"
                >
                  {t('users.previous')}
                </button>
                <button
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 border border-[var(--border-secondary)] rounded text-sm disabled:opacity-50 text-[var(--text-primary)]"
                >
                  {t('users.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
