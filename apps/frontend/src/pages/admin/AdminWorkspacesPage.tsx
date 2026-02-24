import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';

export default function AdminWorkspacesPage() {
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
      <h1 className="text-2xl font-bold mb-6">Workspace Management</h1>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search workspaces..."
          className="border rounded-md px-3 py-2 text-sm flex-1 max-w-md"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        )}
      </form>

      <div className="flex gap-6">
        {/* Workspace List */}
        <div className="flex-1">
          {isLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Members</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Boards</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data?.data.map((ws) => (
                      <tr key={ws.id} className={`hover:bg-gray-50 ${selectedId === ws.id ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3 font-medium">{ws.name}</td>
                        <td className="px-4 py-3 text-gray-500">{ws.owner?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{ws.memberCount}</td>
                        <td className="px-4 py-3 text-gray-500">{ws.boardCount}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(ws.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedId(selectedId === ws.id ? null : ws.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {selectedId === ws.id ? 'Close' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
                  </div>
                  <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50">
                      Previous
                    </button>
                    <button disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedId && detail && (
          <div className="w-80 bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-lg mb-2">{detail.name}</h3>
            {detail.description && <p className="text-sm text-gray-500 mb-4">{detail.description}</p>}

            <h4 className="font-medium text-sm text-gray-700 mb-2">Members ({detail.members.length})</h4>
            <div className="space-y-2 mb-4">
              {detail.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.user.name}</span>
                  <span className="text-xs text-gray-400">{m.role}</span>
                </div>
              ))}
            </div>

            <h4 className="font-medium text-sm text-gray-700 mb-2">Boards ({detail.boards.length})</h4>
            <div className="space-y-2">
              {detail.boards.map((b) => (
                <div key={b.id} className="text-sm flex items-center justify-between">
                  <span>{b.title}</span>
                  {b.archivedAt && (
                    <span className="text-xs text-gray-400">Archived</span>
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
