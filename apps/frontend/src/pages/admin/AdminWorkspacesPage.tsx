import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

export default function AdminWorkspacesPage() {
  const { t } = useTranslation('admin');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'workspaces', page, search],
    queryFn: () => adminApi.getWorkspaces({ page, limit: 20, search: search || undefined }),
  });

  const { data: detail } = useQuery({
    queryKey: ['admin', 'workspace', selectedId],
    queryFn: () => adminApi.getWorkspaceDetail(selectedId!),
    enabled: !!selectedId,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">{t('workspaces.title')}</h1>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('workspaces.searchPlaceholder')}
          className="border border-[var(--border-secondary)] rounded-md px-3 py-2 text-sm flex-1 max-w-md bg-[var(--bg-primary)] text-[var(--text-primary)]"
        />
        <button
          type="submit"
          className="bg-[var(--accent)] text-white px-4 py-2 rounded-md text-sm hover:opacity-90"
        >
          {t('workspaces.search')}
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            {t('workspaces.clear')}
          </button>
        )}
      </form>

      <div className="flex gap-6">
        {/* Workspace List */}
        <div className="flex-1">
          {isLoading ? (
            <div className="text-[var(--text-tertiary)]">{t('workspaces.loading')}</div>
          ) : (
            <>
              <div className="bg-[var(--bg-primary)] rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-secondary)]">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('workspaces.name')}</th>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('workspaces.owner')}</th>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('workspaces.members')}</th>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('workspaces.boards')}</th>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">{t('workspaces.created')}</th>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-primary)]">
                    {data?.data.map((ws) => (
                      <tr
                        key={ws.id}
                        className={`hover:bg-[var(--bg-hover)] ${selectedId === ws.id ? 'bg-[var(--bg-hover)]' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{ws.name}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{ws.owner?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{ws.memberCount}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{ws.boardCount}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {new Date(ws.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedId(selectedId === ws.id ? null : ws.id)}
                            className="text-xs text-[var(--accent)] hover:text-[var(--accent)]"
                          >
                            {selectedId === ws.id ? t('workspaces.close') : t('workspaces.details')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-[var(--text-tertiary)]">
                    {t('workspaces.page', {
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
                      {t('workspaces.previous')}
                    </button>
                    <button
                      disabled={page >= data.meta.totalPages}
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1 border border-[var(--border-secondary)] rounded text-sm disabled:opacity-50 text-[var(--text-primary)]"
                    >
                      {t('workspaces.next')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedId && detail && (
          <div className="w-80 bg-[var(--bg-primary)] rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)]">{detail.name}</h3>
            {detail.description && (
              <p className="text-sm text-[var(--text-secondary)] mb-4">{detail.description}</p>
            )}

            <h4 className="font-medium text-sm text-[var(--text-primary)] mb-2">
              {t('workspaces.members')} ({detail.members.length})
            </h4>
            <div className="space-y-2 mb-4">
              {detail.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-primary)]">{m.user.name}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{m.role}</span>
                </div>
              ))}
            </div>

            <h4 className="font-medium text-sm text-[var(--text-primary)] mb-2">
              {t('workspaces.boards')} ({detail.boards.length})
            </h4>
            <div className="space-y-2">
              {detail.boards.map((b) => (
                <div key={b.id} className="text-sm flex items-center justify-between">
                  <span className="text-[var(--text-primary)]">{b.title}</span>
                  {b.archivedAt && (
                    <span className="text-xs text-[var(--text-tertiary)]">{t('workspaces.archived')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
