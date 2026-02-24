import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesApi } from '@/api/workspaces';
import { boardsApi, type Board } from '@/api/boards';

type SortOption = 'recent' | 'name' | 'created';

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

  // BD-004: Archived boards toggle
  const [showArchived, setShowArchived] = useState(false);

  // BD-008: Sort option
  const [sortOption, setSortOption] = useState<SortOption>('recent');

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

  // BD-005, BD-006: Favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ['boards', 'favorites'],
    queryFn: () => boardsApi.getFavorites(),
  });

  const favoriteIds = useMemo(() => new Set(favorites.map((b: Board) => b.id)), [favorites]);

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

  // BD-005, BD-006: Toggle favorite
  const toggleFavoriteMutation = useMutation({
    mutationFn: (boardId: string) => boardsApi.toggleFavorite(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', 'favorites'] });
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

  // BD-008: Sort boards
  const sortedBoards = useMemo(() => {
    if (!boards) return [];
    const copy = [...boards];
    if (sortOption === 'name') {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === 'created') {
      copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // recent: updatedAt desc
      copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return copy;
  }, [boards, sortOption]);

  // BD-005: Separate favorite vs non-favorite boards
  const favoriteBoards = useMemo(
    () => sortedBoards.filter((b) => favoriteIds.has(b.id)),
    [sortedBoards, favoriteIds],
  );
  const regularBoards = useMemo(
    () => sortedBoards.filter((b) => !favoriteIds.has(b.id)),
    [sortedBoards, favoriteIds],
  );

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
          {/* BD-008: Sort dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="text-sm px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-600"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="created">Created</option>
          </select>
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

      {/* BD-005, BD-006: Favorites section */}
      {favoriteBoards.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700">Favorites</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteBoards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                isFavorite={true}
                onToggleFavorite={() => toggleFavoriteMutation.mutate(board.id)}
              />
            ))}
          </div>
        </div>
      )}

      {!sortedBoards.length ? (
        <div className="text-center py-12 text-gray-500">
          <p>No boards yet. Create one to start tracking work.</p>
        </div>
      ) : regularBoards.length > 0 ? (
        <div>
          {favoriteBoards.length > 0 && (
            <h3 className="text-sm font-semibold text-gray-700 mb-3">All Boards</h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularBoards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                isFavorite={false}
                onToggleFavorite={() => toggleFavoriteMutation.mutate(board.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

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

// BD-005, BD-006: Board card with favorite toggle
function BoardCard({
  board,
  isFavorite,
  onToggleFavorite,
}: {
  board: Board;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="relative group bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
      <Link to={`/boards/${board.id}`} className="block">
        <h4 className="font-semibold text-gray-900 pr-8">{board.title}</h4>
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
      {/* Favorite star button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute top-3 right-3 p-1 rounded transition-opacity ${
          isFavorite
            ? 'text-yellow-400 opacity-100'
            : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-yellow-400'
        }`}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>
    </div>
  );
}
