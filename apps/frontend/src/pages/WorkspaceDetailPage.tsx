import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesApi } from '@/api/workspaces';
import { boardsApi, type Board } from '@/api/boards';

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  // BD-004: Archived boards toggle
  const [showArchived, setShowArchived] = useState(false);

  const { data: workspace, isLoading: wsLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspacesApi.getById(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards', workspaceId],
    queryFn: () => boardsApi.list(workspaceId!),
    enabled: !!workspaceId,
  });

  // BD-004: Archived boards query
  const { data: archivedBoards, isLoading: archivedLoading } = useQuery({
    queryKey: ['boards', workspaceId, 'archived'],
    queryFn: () => boardsApi.listArchived(workspaceId!),
    enabled: !!workspaceId && showArchived,
  });

  const createBoardMutation = useMutation({
    mutationFn: (data: { title: string }) => boardsApi.create(workspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] });
      setShowCreate(false);
      setTitle('');
    },
  });

  // BD-004: Restore board mutation
  const restoreBoardMutation = useMutation({
    mutationFn: (id: string) => boardsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId, 'archived'] });
    },
  });

  // BD-004: Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => boardsApi.permanentDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId, 'archived'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createBoardMutation.mutate({ title });
  };

  const getRemainingDays = (archivedAt: string | null): number => {
    if (!archivedAt) return 30;
    return Math.max(
      0,
      30 - Math.floor((Date.now() - new Date(archivedAt).getTime()) / (1000 * 60 * 60 * 24)),
    );
  };

  if (wsLoading || boardsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          &larr; Workspaces
        </Link>
        <h2 className="text-xl font-semibold text-gray-900 mt-2">
          {workspace?.name}
        </h2>
        {workspace?.description && (
          <p className="text-sm text-gray-500 mt-1">{workspace.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Boards</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded border ${showArchived ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            New Board
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Board title"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={createBoardMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {!boards?.length ? (
        <div className="text-center py-12 text-gray-500">
          <p>No boards yet. Create one to start tracking work.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/boards/${board.id}`}
              className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
            >
              <h4 className="font-semibold text-gray-900">{board.title}</h4>
              {board.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {board.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <span>{board._count?.cards ?? 0} cards</span>
                <span>{board._count?.members ?? 0} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* BD-004: Archived boards section */}
      {showArchived && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1.647 11.647A2 2 0 008.638 21h6.724a2 2 0 001.991-1.353L19 8" />
            </svg>
            <h3 className="text-base font-medium text-gray-700">Archived Boards</h3>
          </div>

          {archivedLoading ? (
            <div className="text-sm text-gray-400">Loading archived boards...</div>
          ) : !archivedBoards?.length ? (
            <div className="text-sm text-gray-400 py-4">No archived boards.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedBoards.map((board: Board) => {
                const remainingDays = getRemainingDays(board.archivedAt);
                return (
                  <div
                    key={board.id}
                    className="bg-white rounded-lg shadow-sm border border-amber-200 p-4 opacity-80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-700 truncate">{board.title}</h4>
                        {board.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {board.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${remainingDays <= 7 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {remainingDays === 0 ? 'Expires today' : `${remainingDays}d remaining`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => restoreBoardMutation.mutate(board.id)}
                          disabled={restoreBoardMutation.isPending}
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          title="Restore board"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Permanently delete "${board.title}"? This cannot be undone.`)) {
                              permanentDeleteMutation.mutate(board.id);
                            }
                          }}
                          disabled={permanentDeleteMutation.isPending}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                          title="Permanently delete"
                        >
                          Delete forever
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
