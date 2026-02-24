import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, type DropResult, type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { boardsApi, type Card, type Column } from '@/api/boards';
import CardDetailModal from '@/components/CardDetailModal';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-blue-400',
  LOW: 'bg-gray-400',
};

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function getDueDateStatus(dueDate: string | null): { label: string; className: string } | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Overdue', className: 'bg-red-100 text-red-700' };
  if (diffDays === 0) return { label: 'Due today', className: 'bg-orange-100 text-orange-700' };
  if (diffDays <= 3) return { label: `D-${diffDays}`, className: 'bg-yellow-100 text-yellow-700' };
  return { label: due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }), className: 'bg-gray-100 text-gray-500' };
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardsApi.getById(boardId!),
    enabled: !!boardId,
  });

  const { data: cards } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: () => boardsApi.getCards(boardId!),
    enabled: !!boardId,
  });

  const { data: columns } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: () => boardsApi.getColumns(boardId!),
    enabled: !!boardId,
  });

  // Extract unique labels and assignees for filter dropdowns
  const { allLabels, allAssignees } = useMemo(() => {
    const labelMap = new Map<string, { id: string; name: string; color: string }>();
    const assigneeMap = new Map<string, { id: string; name: string }>();
    (cards ?? []).forEach((card) => {
      card.labels?.forEach((cl) => labelMap.set(cl.label.id, cl.label));
      card.assignees?.forEach((a) => assigneeMap.set(a.user.id, a.user));
    });
    return {
      allLabels: Array.from(labelMap.values()),
      allAssignees: Array.from(assigneeMap.values()),
    };
  }, [cards]);

  // Filter cards
  const filteredCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card) => {
      if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterPriority && card.priority !== filterPriority) return false;
      if (filterLabel && !card.labels?.some((cl) => cl.label.id === filterLabel)) return false;
      if (filterAssignee && !card.assignees?.some((a) => a.user.id === filterAssignee)) return false;
      return true;
    });
  }, [cards, searchQuery, filterPriority, filterLabel, filterAssignee]);

  const hasActiveFilters = searchQuery || filterPriority || filterLabel || filterAssignee;

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: { columnId: string; position: number } }) =>
      boardsApi.moveCard(cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  const moveColumnMutation = useMutation({
    mutationFn: ({ columnId, data }: { columnId: string; data: { position: number } }) =>
      boardsApi.moveColumn(columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (data: { title: string; columnId: string }) =>
      boardsApi.createCard(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: (data: { title: string }) =>
      boardsApi.createColumn(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { type, draggableId, destination } = result;

    if (type === 'COLUMN') {
      if (!columns) return;
      const sorted = [...columns].sort((a, b) => a.position - b.position);
      const filtered = sorted.filter((c) => c.id !== draggableId);
      const destIndex = destination.index;

      let newPosition: number;
      if (filtered.length === 0) {
        newPosition = 1024;
      } else if (destIndex === 0) {
        newPosition = filtered[0].position / 2;
      } else if (destIndex >= filtered.length) {
        newPosition = filtered[filtered.length - 1].position + 1024;
      } else {
        newPosition = (filtered[destIndex - 1].position + filtered[destIndex].position) / 2;
      }

      moveColumnMutation.mutate({
        columnId: draggableId,
        data: { position: newPosition },
      });
      return;
    }

    // Card drag
    if (!cards || !columns) return;
    const destColumnId = destination.droppableId;
    const destCards = filteredCards
      .filter((c) => c.columnId === destColumnId && c.id !== draggableId)
      .sort((a, b) => a.position - b.position);

    let newPosition: number;
    const destIndex = destination.index;

    if (destCards.length === 0) {
      newPosition = 1024;
    } else if (destIndex === 0) {
      newPosition = destCards[0].position / 2;
    } else if (destIndex >= destCards.length) {
      newPosition = destCards[destCards.length - 1].position + 1024;
    } else {
      newPosition = (destCards[destIndex - 1].position + destCards[destIndex].position) / 2;
    }

    moveCardMutation.mutate({
      cardId: draggableId,
      data: { columnId: destColumnId, position: newPosition },
    });
  };

  if (boardLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-gray-500">Loading board...</div>
      </div>
    );
  }

  const sortedColumns = [...(columns ?? board?.columns ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Board header */}
      <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/workspaces/${board?.workspaceId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back
          </Link>
          <h2 className="text-lg font-semibold text-gray-900">{board?.title}</h2>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="px-4 py-2 border-b bg-white flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cards..."
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {allLabels.length > 0 && (
          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All labels</option>
            {allLabels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
        {allAssignees.length > 0 && (
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All assignees</option>
            {allAssignees.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
        {hasActiveFilters && (
          <button
            onClick={() => { setSearchQuery(''); setFilterPriority(''); setFilterLabel(''); setFilterAssignee(''); }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 h-full"
              >
                {sortedColumns.map((column, index) => (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`w-72 flex-shrink-0 ${snapshot.isDragging ? 'opacity-80' : ''}`}
                      >
                        <KanbanColumn
                          column={column}
                          cards={filteredCards.filter((c) => c.columnId === column.id).sort((a, b) => a.position - b.position)}
                          onAddCard={(title) => createCardMutation.mutate({ title, columnId: column.id })}
                          onCardClick={(cardId) => setSelectedCardId(cardId)}
                          dragHandleProps={provided.dragHandleProps}
                          dimFiltered={!!hasActiveFilters}
                          totalCards={(cards ?? []).filter((c) => c.columnId === column.id).length}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                <AddColumnButton onAdd={(title) => createColumnMutation.mutate({ title })} />
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  cards,
  onAddCard,
  onCardClick,
  dragHandleProps,
  dimFiltered,
  totalCards,
}: {
  column: Column;
  cards: Card[];
  onAddCard: (title: string) => void;
  onCardClick: (cardId: string) => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  dimFiltered: boolean;
  totalCards: number;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAddCard(title.trim());
      setTitle('');
      setIsAdding(false);
    }
  };

  const displayCount = dimFiltered ? `${cards.length}/${totalCards}` : String(cards.length);

  return (
    <div className="flex flex-col bg-gray-100 rounded-lg h-full">
      <div
        {...dragHandleProps}
        className="px-3 py-2 flex items-center justify-between cursor-grab"
      >
        <div className="flex items-center gap-2">
          {column.color && (
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
          )}
          <h3 className="font-medium text-sm text-gray-700">{column.title}</h3>
          <span className="text-xs text-gray-400">{displayCount}</span>
        </div>
        {column.wipLimit && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${totalCards >= column.wipLimit ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
            {column.wipLimit}
          </span>
        )}
      </div>

      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-2 pb-2 min-h-[2rem] ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
          >
            {cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onCardClick(card.id)}
                    className={`bg-white rounded-lg shadow-sm border p-3 mb-2 cursor-grab ${snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-1 h-full min-h-[1rem] rounded-full ${PRIORITY_COLORS[card.priority] ?? 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {card.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-400">
                            KF-{String(card.cardNumber).padStart(3, '0')}
                          </span>
                          {card.labels?.map((cl) => (
                            <span
                              key={cl.label.id}
                              className="text-xs px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: cl.label.color }}
                            >
                              {cl.label.name}
                            </span>
                          ))}
                          {(() => {
                            const status = getDueDateStatus(card.dueDate);
                            if (!status) return null;
                            return (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${status.className}`}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </div>
                        {card.assignees && card.assignees.length > 0 && (
                          <div className="flex -space-x-1 mt-2">
                            {card.assignees.map((a) => (
                              <div
                                key={a.user.id}
                                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                                title={a.user.name}
                              >
                                {a.user.name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="px-2 pb-2">
        {isAdding ? (
          <form onSubmit={handleAdd}>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200 rounded"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}

function AddColumnButton({ onAdd }: { onAdd: (title: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <div className="w-72 flex-shrink-0">
        <form onSubmit={handleAdd} className="bg-gray-100 rounded-lg p-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Column title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsAdding(false);
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-72 flex-shrink-0">
      <button
        onClick={() => setIsAdding(true)}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-500 font-medium"
      >
        + Add column
      </button>
    </div>
  );
}
