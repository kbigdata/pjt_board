import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useUIStore } from '@/stores/ui';

export default function FavoritesView() {
  const navigate = useNavigate();
  const { setNavView } = useUIStore();
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const { data: boards = [], isLoading } = useFavorites();

  const handleBoardClick = (boardId: string) => {
    setNavView('home');
    navigate(`/boards/${boardId}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center gap-2 mb-4">
        <Star size={18} className="text-[var(--text-primary)]" />
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          {t('sidebar.favoriteBoards')}
        </h1>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--text-tertiary)] py-8 text-center">
          {tc('loading')}
        </div>
      ) : boards.length === 0 ? (
        <div className="text-sm text-[var(--text-tertiary)] py-8 text-center">
          {t('sidebar.noFavorites')}
        </div>
      ) : (
        <div className="space-y-1">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => handleBoardClick(board.id)}
              className="w-full text-left px-3 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
            >
              <Star size={16} className="flex-shrink-0 text-yellow-500 fill-yellow-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {board.title}
                </p>
                {board.createdBy && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {board.createdBy.name}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
