import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type Card, type Column } from '@/api/boards';
import { type Sprint } from '@/api/sprints';
import SprintSelector from './SprintSelector';
import SprintBacklog from './SprintBacklog';

interface SprintBoardProps {
  boardId: string;
  cards: Card[];
  columns: Column[];
  activeSprint: Sprint | null;
  sprints: Sprint[];
  onCardClick: (cardId: string) => void;
  onCreateSprint: () => void;
  onStartSprint: (id: string) => void;
  onCompleteSprint: (id: string) => void;
  onCancelSprint: (id: string) => void;
  onAddCards: (cardIds: string[]) => void;
  onRemoveCards: (cardIds: string[]) => void;
}

export default function SprintBoard({
  boardId,
  cards,
  columns,
  activeSprint,
  sprints,
  onCardClick,
  onCreateSprint,
  onStartSprint,
  onCompleteSprint,
  onCancelSprint,
  onAddCards,
  onRemoveCards: _onRemoveCards,
}: SprintBoardProps) {
  const { t } = useTranslation('sprint');
  const [backlogOpen, setBacklogOpen] = useState(true);

  // Filter cards for active sprint
  const sprintCards = useMemo(() => {
    if (!activeSprint) return [];
    return cards.filter((c) => c.sprintId === activeSprint.id);
  }, [cards, activeSprint]);

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  );

  return (
    <div className="flex flex-col h-full">
      <SprintSelector
        boardId={boardId}
        activeSprint={activeSprint}
        sprints={sprints}
        onCreateClick={onCreateSprint}
        onStartSprint={onStartSprint}
        onCompleteSprint={onCompleteSprint}
        onCancelSprint={onCancelSprint}
        onSelectSprint={() => {}}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Backlog panel */}
        <SprintBacklog
          cards={cards}
          onAddToSprint={onAddCards}
          isOpen={backlogOpen}
          onToggle={() => setBacklogOpen(!backlogOpen)}
        />

        {/* Sprint columns */}
        <div className="flex-1 overflow-x-auto p-4">
          {!activeSprint ? (
            <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">
              <div className="text-center">
                <p className="text-lg mb-2">{t('noActiveSprint')}</p>
                <button
                  onClick={onCreateSprint}
                  className="text-sm px-4 py-2 rounded bg-[var(--accent)] text-white hover:opacity-90"
                >
                  {t('createSprint')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-full">
              {sortedColumns.map((col) => {
                const colCards = sprintCards
                  .filter((c) => c.columnId === col.id)
                  .sort((a, b) => a.position - b.position);

                return (
                  <div
                    key={col.id}
                    className="w-72 flex-shrink-0 flex flex-col bg-[var(--bg-secondary)] rounded-lg"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)]">
                      <div className="flex items-center gap-2">
                        {col.color && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: col.color }}
                          />
                        )}
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {col.title}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-tertiary)]">{colCards.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {colCards.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => onCardClick(card.id)}
                          className="w-full text-left p-2 rounded bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--accent)] shadow-sm"
                        >
                          <div className="text-sm text-[var(--text-primary)]">{card.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[var(--text-tertiary)]">
                              KF-{card.cardNumber}
                            </span>
                            {card.priority && card.priority !== 'MEDIUM' && (
                              <span
                                className={`text-xs px-1 rounded ${
                                  card.priority === 'CRITICAL'
                                    ? 'bg-red-100 text-red-700'
                                    : card.priority === 'HIGH'
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {card.priority}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
