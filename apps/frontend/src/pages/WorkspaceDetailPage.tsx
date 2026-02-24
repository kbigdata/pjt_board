import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesApi } from '@/api/workspaces';
import { boardsApi } from '@/api/boards';

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');

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

  const createBoardMutation = useMutation({
    mutationFn: (data: { title: string }) => boardsApi.create(workspaceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] });
      setShowCreate(false);
      setTitle('');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createBoardMutation.mutate({ title });
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
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          New Board
        </button>
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
    </div>
  );
}
