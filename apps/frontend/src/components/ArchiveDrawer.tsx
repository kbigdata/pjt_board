import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardsApi, type Card } from '@/api/boards';

export default function ArchiveDrawer({
  boardId,
  isOpen,
  onClose,
}: {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: archivedCards, isLoading } = useQuery({
    queryKey: ['cards', boardId, 'archived'],
    queryFn: () => boardsApi.getArchivedCards(boardId),
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: (cardId: string) => boardsApi.restoreCard(cardId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['cards', boardId, 'archived'] });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-[3.5rem] bottom-0 w-80 bg-white border-l shadow-lg z-40 flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900">Archived Cards</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : !archivedCards || archivedCards.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">No archived cards.</div>
        ) : (
          <div className="divide-y">
            {archivedCards.map((card) => (
              <ArchivedCardItem
                key={card.id}
                card={card}
                isRestoring={restoreMutation.isPending && restoreMutation.variables === card.id}
                onRestore={() => restoreMutation.mutate(card.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArchivedCardItem({
  card,
  isRestoring,
  onRestore,
}: {
  card: Card;
  isRestoring: boolean;
  onRestore: () => void;
}) {
  const cardNumber = `KF-${String(card.cardNumber).padStart(3, '0')}`;

  return (
    <div className="px-4 py-3 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-mono mb-0.5">{cardNumber}</p>
          <p className="text-sm text-gray-800 font-medium truncate">{card.title}</p>
          {card.column?.title && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              Column: {card.column.title}
            </p>
          )}
        </div>
        <button
          onClick={onRestore}
          disabled={isRestoring}
          className="flex-shrink-0 text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isRestoring ? 'Restoring…' : 'Restore'}
        </button>
      </div>
    </div>
  );
}
