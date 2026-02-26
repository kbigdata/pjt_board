import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { workspacesApi } from '@/api/workspaces';
import { boardsApi, type Board } from '@/api/boards';
import { useUIStore } from '@/stores/ui';

interface BoardWithWorkspace extends Board {
  workspaceName: string;
}

function useAllBoards() {
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspacesApi.list(),
  });

  return useQuery({
    queryKey: ['all-boards', workspaces.map((w) => w.id)],
    queryFn: async () => {
      const results: BoardWithWorkspace[] = [];
      for (const ws of workspaces) {
        const boards = await boardsApi.list(ws.id);
        for (const board of boards) {
          results.push({ ...board, workspaceName: ws.name });
        }
      }
      return results;
    },
    enabled: workspaces.length > 0,
  });
}

export default function SearchView() {
  const navigate = useNavigate();
  const { setNavView } = useUIStore();
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: allBoards = [], isLoading } = useAllBoards();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredBoards = debouncedQuery.trim()
    ? allBoards.filter((board) =>
        board.title.toLowerCase().includes(debouncedQuery.toLowerCase()),
      )
    : [];

  const handleBoardClick = (boardId: string) => {
    setNavView('home');
    navigate(`/boards/${boardId}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Search input */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('sidebar.searchPlaceholder')}
          className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--input-bg,transparent)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-sm text-[var(--text-tertiary)] py-8 text-center">
          {tc('loading')}
        </div>
      ) : !debouncedQuery.trim() ? (
        <div className="text-sm text-[var(--text-tertiary)] py-8 text-center">
          {t('sidebar.searchHint')}
        </div>
      ) : filteredBoards.length === 0 ? (
        <div className="text-sm text-[var(--text-tertiary)] py-8 text-center">
          {t('sidebar.searchEmpty')}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredBoards.map((board) => (
            <button
              key={board.id}
              onClick={() => handleBoardClick(board.id)}
              className="w-full text-left px-3 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {board.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {board.workspaceName}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
